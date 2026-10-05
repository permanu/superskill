package main

import (
	"fmt"

	"example.com/proj/util"
)

type Formatter interface {
	Format(string) string
}

type Reporter struct {
	count int
}

func (r *Reporter) Report(msg string) string {
	r.count++
	return Format(msg)
}

func Format(msg string) string {
	return util.Normalize(msg)
}

func main() {
	fmt.Println(Format("hello"))
}
