---
id: java-io-malformed-report
lang: java
prefix: io
title: "Decode untrusted text with REPORT, not silent REPLACE"
severity: should
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [charset, decode, malformed, validation]
  files: ["**/*.java"]
  symbols: [CharsetDecoder, CodingErrorAction]
related: [java-io-charset-explicit]
sources:
  - title: "CharsetDecoder API"
    url: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/nio/charset/CharsetDecoder.html
---
> Keep the decoder's default REPORT action when the bytes may be invalid; REPLACE hides corruption.

## Why

The CharsetDecoder documentation states that "the default action for malformed-input and unmappable-character errors is to report them", which surfaces as CharacterCodingException. Switching to CodingErrorAction.REPLACE substitutes the replacement character, so corrupted or hostile byte sequences pass validation as ordinary text and downstream code cannot tell the payload was altered. Report malformed input and let the caller decide whether to reject it.

## Bad

```java
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;

class MessageDecoder {

    String decode(byte[] bytes) throws CharacterCodingException {
        return StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPLACE)
                .decode(ByteBuffer.wrap(bytes))
                .toString();
    }
}
```

## Good

```java
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;

class MessageDecoder {

    String decode(byte[] bytes) throws CharacterCodingException {
        return StandardCharsets.UTF_8.newDecoder()
                .decode(ByteBuffer.wrap(bytes))
                .toString();
    }
}
```

## See Also

- [java-io-charset-explicit](io-charset-explicit.md) - choosing the charset before decoding
