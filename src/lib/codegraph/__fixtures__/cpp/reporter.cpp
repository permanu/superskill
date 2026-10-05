#include <string>

#include "util.hpp"

namespace app {

class Reporter {
public:
    explicit Reporter(int count) : count_(count) {}

    int report(const std::string &message) {
        count_ += 1;
        return format(message);
    }

private:
    int format(const std::string &message) const;
    int count_;
};

struct Options {
    bool strict;
};

int make_reporter() {
    return 0;
}

}  // namespace app
