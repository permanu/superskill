import Foundation

public let defaultLevel = "warn"

public protocol Formatter {
    func format(_ message: String) -> String
}

public class Reporter: Formatter {
    private var count = 0

    public init() {}

    public func report(_ message: String) -> String {
        count += 1
        return format(message)
    }

    public func format(_ message: String) -> String {
        return message
    }
}

public func normalize(_ input: String) -> String {
    return input.trimmingCharacters(in: .whitespaces)
}
