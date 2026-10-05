#include <stdio.h>
#include "util.h"

#define MAX_COUNT 10

struct reporter {
    int count;
};

int format_message(const char *msg) {
    return puts(msg);
}

int report_message(struct reporter *r, const char *msg) {
    r->count++;
    return format_message(msg);
}
