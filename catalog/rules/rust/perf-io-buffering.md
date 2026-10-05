---
id: rust-perf-io-buffering
lang: rust
prefix: perf
title: "Wrap `Read`/`Write` in `BufReader`/`BufWriter` for many small operations"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: ["buffering", "wrap", "read", "write", "bufreader", "bufwriter", "many", "small"]
  files: ["**/*.rs"]
  symbols: ["Read", "Write", "BufReader", "BufWriter"]
related: ["rust-mem-with-capacity", "rust-perf-profile-first"]
sources:
  - title: "rust-skills: perf-io-buffering"
    url: https://github.com/leonardomso/rust-skills/blob/master/rules/perf-io-buffering.md
---
> Wrap `Read`/`Write` in `BufReader`/`BufWriter` for many small operations

## Why

Every unbuffered read or write to a file or socket is a syscall. Calling `read()` byte-by-byte or line-by-line without buffering can issue millions of syscalls per second, each with kernel-transition overhead that dwarfs the actual data transfer. `BufReader` and `BufWriter` batch those operations into large internal buffer reads and writes, cutting syscall count by orders of magnitude. This is one of the highest-impact, lowest-effort performance fixes available for IO-heavy code.

## Bad

```rust
use std::fs::File;
use std::io::{Read, Write};

// Every read call is a syscall: terrible for line-by-line processing
fn count_lines_slow(path: &str) -> std::io::Result<usize> {
    let mut file = File::open(path)?;
    let (mut count, mut byte) = (0usize, [0u8; 1]);
    loop {
        match file.read(&mut byte) {
            Ok(0) => break,
            Ok(_) => if byte[0] == b'\n' { count += 1 },
            Err(e) => return Err(e),
        }
    }
    Ok(count)
}
// Writing many small records without buffering: one syscall per write
fn write_records_slow(path: &str, records: &[String]) -> std::io::Result<()> {
    let mut file = File::create(path)?;
    for record in records {
        file.write_all(record.as_bytes())?;
        file.write_all(b"\n")?;
    }
    Ok(())
}
```

## Good

```rust
use std::fs::File;
use std::io::{self, BufRead, BufReader, BufWriter, Write};

// BufReader batches OS reads; lines() avoids a syscall per line
fn count_lines_fast(path: &str) -> io::Result<usize> {
    let reader = BufReader::new(File::open(path)?);
    let mut count = 0usize;
    for line in reader.lines() {
        line?;
        count += 1;
    }
    Ok(count)
}

// BufWriter batches writes; flush() surfaces errors that drop() would swallow
fn write_records_fast(path: &str, records: &[String]) -> io::Result<()> {
    let mut writer = BufWriter::new(File::create(path)?);
    for record in records {
        writer.write_all(record.as_bytes())?;
        writer.write_all(b"\n")?;
    }
    writer.flush()?; // MUST flush: drop() swallows flush errors
    Ok(())
}
```

## See Also

- [rust-mem-with-capacity](mem-with-capacity.md) - Pre-size buffers when the final size is known
- [rust-perf-profile-first](perf-profile-first.md) - confirm IO is the bottleneck before tuning
