import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { codexSource } from "./codex.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function load(payloads: object[], opts = {}) {
  const root = await mkdtemp(join(tmpdir(), "codex-nested-")); roots.push(root);
  const storagePath = join(root, "trace.jsonl");
  await writeFile(storagePath, payloads.map(payload => JSON.stringify({ type: "response_item", payload })).join("\n"));
  return codexSource.load({ tool: "codex", id: "test", startedAt: 0, storagePath }, opts);
}

describe("Codex nested execution evidence", () => {
  it("extracts literal shell and patch activity without executing JavaScript", async () => {
    const input = `text(await tools.exec_command({cmd:"cat 'src/a b.ts'; sed -n '1,20p' src/c.ts", workdir:"/tmp/repo"})); await tools.apply_patch("*** Begin Patch\\n*** Update File: src/d.ts\\n@@\\n-a\\n+b\\n*** End Patch");`;
    const trace = await load([{ type: "custom_tool_call", name: "exec", input, call_id: "a" }]);
    expect(trace.commands).toEqual(["cat 'src/a b.ts'; sed -n '1,20p' src/c.ts"]);
    expect(trace.filesRead).toEqual(["/tmp/repo/src/a b.ts", "/tmp/repo/src/c.ts"]);
    expect(trace.filesWritten).toContain("src/d.ts");
    expect(trace.toolCalls[0].status).toBe("unknown");
  });
  it("reads function_call arguments, structured exit failures and MCP errors", async () => {
    const trace = await load([
      { type: "function_call", name: "exec_command", arguments: JSON.stringify({cmd:"cat src/a.ts"}), call_id:"a" },
      { type: "function_call_output", call_id:"a", output: JSON.stringify({exit_code:2,output:"ENOENT"}) },
      { type: "custom_tool_call", name:"exec", input:'text(await tools.exec_command({cmd:"npm test"}));',call_id:"b" },
      { type:"custom_tool_call_output",call_id:"b",output:[{type:"input_text",text:'Script completed\nOutput:\n'}, {type:"input_text",text:JSON.stringify({content:[{type:"text",text:'{"success":false,"error":"failed validation"}'}],isError:true})}] }
    ]);
    expect(trace.filesRead).toEqual(["src/a.ts"]);
    expect(trace.toolCalls.map(call=>call.status)).toEqual(["error","error"]);
    expect(trace.toolCalls[0].errorText).toContain("ENOENT");
  });
  it("keeps yielded calls unknown until wait resolves them", async () => {
    const trace = await load([
      {type:"custom_tool_call",name:"exec",input:'text(await tools.exec_command({cmd:"npm test"}));',call_id:"a"},
      {type:"custom_tool_call_output",call_id:"a",output:"Script running with cell ID 42"},
      {type:"function_call",name:"wait",arguments:'{"cell_id":"42"}',call_id:"w"},
      {type:"function_call_output",call_id:"w",output:'Script completed\nOutput:\n{"exit_code":1,"output":"tests failed"}'}
    ]);
    expect(trace.toolCalls[0].status).toBe("error");
    const pending = await load([{type:"custom_tool_call",name:"exec",input:"1",call_id:"a"},{type:"custom_tool_call_output",call_id:"a",output:"Script running with cell ID 42"}]);
    expect(pending.toolCalls[0].status).toBe("unknown");
  });
  it("does not bind capped calls to previous calls", async () => {
    const trace = await load([
      {type:"function_call",name:"exec_command",arguments:'{"cmd":"npm test"}',call_id:"a"},
      {type:"function_call",name:"exec_command",arguments:'{"cmd":"npm test again"}',call_id:"b"},
      {type:"function_call_output",call_id:"b",output:'{"exit_code":0}'}
    ], {maxCalls:1});
    expect(trace.toolCalls[0].status).toBe("unknown");
  });
  it("uses full inputs for signatures and ignores dynamic, commented, and string-embedded calls", async () => {
    const prefix = " ".repeat(200);
    const trace = await load([
      {type:"custom_tool_call", name:"exec", input:prefix+'text(await tools.exec_command({cmd:"cat src/a.ts"}))'},
      {type:"custom_tool_call", name:"exec", input:prefix+'text(await tools.exec_command({cmd:"cat src/b.ts"}))'},
      {type:"custom_tool_call", name:"exec", input:'// tools.exec_command({cmd:"cat secret.ts"})\nconst example = "tools.exec_command({cmd:evil})"; tools.exec_command({cmd:`cat ${dynamic}`});'}
    ]);
    expect(trace.toolCalls[0].inputSignature).not.toBe(trace.toolCalls[1].inputSignature);
    expect(trace.filesRead).toEqual(["src/a.ts","src/b.ts"]);
  });
});

it("does not interpret heredoc program bodies or file descriptors as file writes", async () => {
  const cmd = "python3 - <<'PY'\nitems.map(x => x.path)\nPY\nrg -g '*.ts' -n 'needle' src/a.ts 2>&1 > /tmp/report.log";
  const trace = await load([{type:"function_call",name:"exec_command",arguments:JSON.stringify({cmd})}]);
  expect(trace.filesWritten).toEqual(["/tmp/report.log"]);
  expect(trace.filesRead).toEqual(["src/a.ts"]);
});

it("processes later output blocks for a call after incremental notifications", async () => {
  const trace = await load([
    {type:"custom_tool_call",name:"exec",input:'text(await tools.exec_command({cmd:"npm test"}));',call_id:"a"},
    {type:"custom_tool_call_output",call_id:"a",output:"progress"},
    {type:"custom_tool_call_output",call_id:"a",output:'{"exit_code":1,"output":"assertion failed"}'}
  ]);
  expect(trace.toolCalls[0].status).toBe("error");
  expect(trace.toolCalls[0].outputBytes).toBeGreaterThan(Buffer.byteLength("progress"));
});

it("uses process envelope status without interpreting stdout fixtures as errors", async () => {
  const outputs = [
    'Script completed\nOutput:\n{"exit_code":0,"output":"Process exited with code 1"}',
    JSON.stringify({exit_code:0,output:"Process exited with code 1"}),
    JSON.stringify({exit_code:0,output:'{"exit_code":1,"isError":true}'}),
    JSON.stringify({exit_code:0,output:"Script running with cell ID 123"}),
    [{type:"input_text",text:"Script completed\nOutput:\n"},{type:"input_text",text:JSON.stringify({exit_code:0,output:"Error executing\nScript failed"})}],
  ];
  for (const output of outputs) {
    const trace = await load([{type:"function_call",name:"exec_command",arguments:'{"cmd":"cat fixture.json"}',call_id:"a"},{type:"function_call_output",call_id:"a",output}]);
    expect(trace.toolCalls[0].status).toBe("ok");
  }
});
