import Foundation

/// JSONDecoder routes bare JSON numbers through Double, so `23.15` can become
/// `23.149999999999999`. Money is parsed from the raw literal via `Decimal(string:)`.
enum EstimateCodec {
    static func decode(_ data: Data) throws -> CachedEstimateResponse {
        let prepared = try quoteMoneyLiterals(in: data)
        return try JSONDecoder().decode(CachedEstimateResponse.self, from: prepared)
    }

    /// Turns `"total": 23.15` / `"price": 0` into quoted strings; leaves `null` alone.
    static func quoteMoneyLiterals(in data: Data) throws -> Data {
        guard let text = String(data: data, encoding: .utf8) else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(codingPath: [], debugDescription: "Estimate JSON is not UTF-8")
            )
        }
        let pattern = #""(total|price)"\s*:\s*(-?(?:0|[1-9]\d*)(?:\.\d+)?)"#
        let regex = try NSRegularExpression(pattern: pattern)
        let range = NSRange(text.startIndex..., in: text)
        let quoted = regex.stringByReplacingMatches(in: text, range: range, withTemplate: "\"$1\": \"$2\"")
        return Data(quoted.utf8)
    }
}

struct LiteralDecimal: Decodable, Hashable, Sendable {
    var value: Decimal

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let literal = try? container.decode(String.self) {
            guard let parsed = Decimal(string: literal, locale: Locale(identifier: "en_US_POSIX")) else {
                throw DecodingError.dataCorruptedError(
                    in: container,
                    debugDescription: "Not a decimal literal: \(literal)"
                )
            }
            value = parsed
            return
        }
        // Whole dollars can arrive as JSON integers; Int avoids the Double path.
        if let integer = try? container.decode(Int64.self) {
            value = Decimal(integer)
            return
        }
        throw DecodingError.dataCorruptedError(
            in: container,
            debugDescription: "Expected a decimal string or integer"
        )
    }
}
