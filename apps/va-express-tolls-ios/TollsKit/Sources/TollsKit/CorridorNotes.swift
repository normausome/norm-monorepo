import Foundation

/// Static caveats shown under every result, keyed by the API's corridor id.
/// Summarised from the operators' public pages (checked Sep 2026) — see
/// `apps/va-express-tolls/src/data/corridors.ts` for the long form.
public enum CorridorNotes {
    public static let disclaimer =
        "Unofficial estimate. The number comes from the operator's own public trip calculator, fetched by the va-express-tolls API; the price on the overhead sign when you enter is what you pay, and it can differ. Not affiliated with VDOT, Transurban, I-66 Express Mobility Partners or E-ZPass."

    public static let fragility =
        "The operators publish no API. The server reads the internal endpoints their calculators use, so a site redesign can break estimates without warning — when that happens you get an error here, never a made-up figure. Automated access is not covered by their terms; this is a demo."

    /// One line for the corridor picker; the thing to know before tapping.
    public static func hint(for corridorID: String) -> String? {
        switch corridorID {
        case "495": return "Tolled 24/7 · Transurban"
        case "395": return "Reversible · one direction at a time · Transurban"
        case "95": return "Route 17 (Stafford) ↔ Springfield · reversible · Transurban"
        case "66-inside": return "Weekday peak only: EB 5:30–9:30 AM, WB 3–7 PM · VDOT"
        case "66-outside": return "Tolled 24/7 · 66 Express Mobility Partners"
        default: return nil
        }
    }

    public static func notes(for corridorID: String) -> [String] {
        switch corridorID {
        case "495":
            return [
                "Tolled 24/7; dynamic pricing posted on the signs before you enter.",
                "E-ZPass required. HOV-3+ free with an E-ZPass Flex in HOV mode; motorcycles free.",
            ]
        case "395", "95":
            return [
                "Reversible lanes — only one direction is open at a time. Weekdays roughly northbound 2:30–11 AM and southbound noon–1 AM; check the notice above for what the operator's feed says right now.",
                "A closed direction has gated ramps and no published price; the app shows no total rather than a stale one.",
                "95 and 395 are priced as one road; a trip continuing onto 495 comes back as a second line item.",
                "E-ZPass required. HOV-3+ free with an E-ZPass Flex in HOV mode; motorcycles free.",
            ]
        case "66-inside":
            return [
                "Tolled weekdays only, peak direction only: eastbound 5:30–9:30 AM, westbound 3–7 PM. Free otherwise, including federal holidays.",
                "Every lane is tolled during the peak — there are no free lanes inside the Beltway then.",
                "E-ZPass required in the peak; HOV-3+ free with an E-ZPass Flex in HOV mode; motorcycles free.",
            ]
        case "66-outside":
            return [
                "Tolled 24/7 in three segments; the sign price locks in per segment as you pass it.",
                "E-ZPass required. HOV-3+ free 24/7 with an E-ZPass Flex in HOV mode. Larger vehicles pay more and are not HOV-eligible.",
                "I-66 and the 495 Express Lanes are different operators — a trip using both is two separate tolls.",
            ]
        default:
            return []
        }
    }
}

public enum Formatting {
    public static func usd(_ amount: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.locale = Locale(identifier: "en_US")
        return f.string(from: NSNumber(value: amount)) ?? String(format: "$%.2f", amount)
    }

    /// `2026-09-09T14:03:00.000Z` → `10:03 AM EDT`; falls back to the raw string when unparseable.
    public static func easternTime(iso: String) -> String {
        let parsers = [ISO8601DateFormatter(), ISO8601DateFormatter()]
        parsers[0].formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        parsers[1].formatOptions = [.withInternetDateTime]
        guard let date = parsers.lazy.compactMap({ $0.date(from: iso) }).first else { return iso }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US")
        f.timeZone = InsideBeltwaySchedule.eastern
        f.dateFormat = "h:mm a zzz"
        return f.string(from: date)
    }
}
