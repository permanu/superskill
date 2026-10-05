---
id: go-sec-html-template
lang: go
prefix: sec
title: Render HTML with html/template, never text/template
severity: must
enforce: review
baseline: latest
status: verified
triggers:
  keywords: [html/template, text/template, XSS, escaping]
  files: ["**/*.go"]
  symbols: [template.New]
related: [go-sec-json-v2, go-sec-cookie-samesite]
sources:
  - title: Package html/template
    url: https://pkg.go.dev/html/template
---
> Use html/template whenever the output is HTML; text/template does not escape.

## Why

The html/template documentation states that it generates HTML output safe against code injection and should be used instead of text/template whenever the output is HTML. The two packages share an interface, so the choice is invisible in the call site but decisive at render time: text/template inserts data verbatim, and a value like a script tag executes in the page. html/template escapes per context, covering HTML, attributes, JavaScript, CSS, and URLs.

## Bad

```go
import (
    "os"
    "text/template"
)

func render(name string) error {
    t, err := template.New("page").Parse("<h1>{{.}}</h1>")
    if err != nil {
        return err
    }
    return t.Execute(os.Stdout, name)
}
```

## Good

```go
import (
    "os"
    "html/template"
)

func render(name string) error {
    t, err := template.New("page").Parse("<h1>{{.}}</h1>")
    if err != nil {
        return err
    }
    return t.Execute(os.Stdout, name)
}
```

## See Also

- [go-sec-json-v2](sec-json-v2.md) - the other encoding package with a safer successor
- [go-sec-cookie-samesite](sec-cookie-samesite.md) - the browser-side half of XSS defense
