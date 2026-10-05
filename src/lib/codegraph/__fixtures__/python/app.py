import os
from .util import normalise, DEFAULT

MAX = 10


class Reporter:
    def __init__(self, strict):
        self.strict = strict
        self.count = 0

    def report(self, message):
        self.count += 1
        return normalise(message, DEFAULT)


def format(message, strict=False):
    if strict:
        return normalise(message)
    return message.strip()


async def flush(lines):
    for line in lines:
        format(line)
