import Foundation
import XCTest
@testable import TollsKit

final class DecodingTests: XCTestCase {
    func testCorridorsDecode() throws {
        let json = """
        [{"id":"495","supported":true,"historical":false,
          "directions":[{"id":"nb","label":"Northbound"},{"id":"sb","label":"Southbound"}],
          "name":"495 Express Lanes","calculatorUrl":"https://expresslanes.com/map-your-trip/"},
         {"id":"66-inside","supported":false,"reason":"Offline for maintenance","historical":true,
          "directions":[{"id":"eb","label":"Eastbound (AM)"}],
          "name":"I-66 Inside the Beltway","calculatorUrl":"https://vai66tolls.com/"}]
        """
        let corridors: [Corridor] = try TollsAPI.decode(Data(json.utf8), status: 200)
        XCTAssertEqual(corridors.map(\.id), ["495", "66-inside"])
        XCTAssertEqual(corridors[0].directions.map(\.id), [.nb, .sb])
        XCTAssertNil(corridors[0].reason)
        XCTAssertEqual(corridors[1].reason, "Offline for maintenance")
        XCTAssertFalse(corridors[1].supported)
    }

    func testPointsDecodeWithNoticeAndCoordinates() throws {
        let json = """
        {"corridor":"395","direction":"nb","notice":"Operator feed: the reversible 95/395 lanes are open northbound right now.",
         "entries":[{"id":"e1","label":"Springfield","lat":38.78,"lng":-77.18,
                     "exits":[{"id":"x1","label":"Pentagon"},{"id":"x2","label":"14th St Bridge","lat":38.87,"lng":-77.04}]}]}
        """
        let points: PointsResponse = try TollsAPI.decode(Data(json.utf8), status: 200)
        XCTAssertEqual(points.direction, .nb)
        XCTAssertEqual(points.notice?.contains("open northbound"), true)
        XCTAssertEqual(points.entries.first?.exits.count, 2)
        XCTAssertNil(points.entries.first?.exits.first?.lat)
    }

    func testEstimateDecodeAndNullTotalIsPreserved() throws {
        let json = """
        {"corridor":"95","direction":"sb","entry":{"id":"a","label":"Springfield"},"exit":{"id":"b","label":"Route 17"},
         "kind":"current","total":null,"currency":"USD",
         "legs":[{"road":"95 and 395 Express Lanes","price":12.5,"observedAt":null,"status":"closed"}],
         "source":{"operator":"Transurban","url":"https://expresslanes.com/map-your-trip/","fetchedAt":"2026-09-09T14:03:00.000Z"},
         "notes":["The operator's feed marks part of this trip closed right now, so no price applies."]}
        """
        let estimate: Estimate = try TollsAPI.decode(Data(json.utf8), status: 200)
        XCTAssertNil(estimate.total, "a closed direction must stay nil even though the feed carries a stale leg price")
        XCTAssertEqual(estimate.legs.first?.status, "closed")
        XCTAssertEqual(estimate.source.operator, "Transurban")
        XCTAssertEqual(estimate.notes.count, 1)
    }

    func testEstimateWithTotal() throws {
        let json = """
        {"corridor":"495","direction":"nb","entry":{"id":"a","label":"Braddock Rd"},"exit":{"id":"b","label":"Dulles Toll Rd"},
         "kind":"current","total":7.85,"currency":"USD",
         "legs":[{"road":"495 Express Lanes","price":7.85,"observedAt":"2026-09-09T14:00:00.000Z","status":"open"}],
         "source":{"operator":"Transurban","url":"https://expresslanes.com/","fetchedAt":"2026-09-09T14:03:00.000Z"},"notes":[]}
        """
        let estimate: Estimate = try TollsAPI.decode(Data(json.utf8), status: 200)
        XCTAssertEqual(estimate.total, 7.85)
        XCTAssertEqual(Formatting.usd(estimate.total!), "$7.85")
    }
}

final class FailClosedTests: XCTestCase {
    func testServerErrorBodyIsSurfacedVerbatim() {
        let data = Data(#"{"error":"That exit is not reachable from the chosen entry"}"#.utf8)
        XCTAssertThrowsError(try TollsAPI.decode(data, status: 400) as Estimate) { error in
            XCTAssertEqual(error as? TollsAPIError, .server("That exit is not reachable from the chosen entry", status: 400))
            XCTAssertEqual(error.localizedDescription, "That exit is not reachable from the chosen entry")
        }
    }

    func testUpstream502IsAnErrorNotAPrice() {
        let data = Data(#"{"error":"expresslanes.com timed out"}"#.utf8)
        XCTAssertThrowsError(try TollsAPI.decode(data, status: 502) as Estimate) { error in
            XCTAssertEqual(error as? TollsAPIError, .server("expresslanes.com timed out", status: 502))
        }
    }

    func testHTMLResponseIsNotJSON() {
        let data = Data("<!doctype html><html>Vite dev server</html>".utf8)
        XCTAssertThrowsError(try TollsAPI.decode(data, status: 200) as [Corridor]) { error in
            XCTAssertEqual(error as? TollsAPIError, .notJSON)
        }
    }

    func testNon2xxWithoutErrorBody() {
        XCTAssertThrowsError(try TollsAPI.decode(Data("{}".utf8), status: 503) as [Corridor]) { error in
            XCTAssertEqual(error as? TollsAPIError, .badStatus(503))
        }
    }

    func testMalformedSuccessBodyIsADecodingError() {
        XCTAssertThrowsError(try TollsAPI.decode(Data(#"{"total":"seven"}"#.utf8), status: 200) as Estimate) { error in
            XCTAssertTrue(error is DecodingError)
        }
    }
}

final class URLBuildingTests: XCTestCase {
    func testPathsAndQueryAgainstBase() throws {
        let api = try TollsAPI(baseURLString: " http://localhost:8787/ ")
        XCTAssertEqual(api.url(path: "/api/corridors").absoluteString, "http://localhost:8787/api/corridors")
        let estimate = api.url(path: "/api/66-inside/estimate", query: [
            URLQueryItem(name: "direction", value: "eb"),
            URLQueryItem(name: "entry", value: "1"),
            URLQueryItem(name: "exit", value: "5"),
        ])
        XCTAssertEqual(estimate.absoluteString, "http://localhost:8787/api/66-inside/estimate?direction=eb&entry=1&exit=5")
    }

    func testBaseWithPathPrefix() throws {
        let api = try TollsAPI(baseURLString: "https://tolls.example.com/preview")
        XCTAssertEqual(api.url(path: "/api/corridors").absoluteString, "https://tolls.example.com/preview/api/corridors")
    }

    func testRejectsGarbageBaseURL() {
        XCTAssertThrowsError(try TollsAPI(baseURLString: "localhost:8787"))
        XCTAssertThrowsError(try TollsAPI(baseURLString: "ftp://x"))
        XCTAssertThrowsError(try TollsAPI(baseURLString: ""))
    }
}

final class ScheduleTests: XCTestCase {
    private func eastern(_ y: Int, _ m: Int, _ d: Int, _ h: Int, _ min: Int) -> Date {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = InsideBeltwaySchedule.eastern
        return c.date(from: DateComponents(year: y, month: m, day: d, hour: h, minute: min))!
    }

    func testWeekdayWindows() {
        // Wed 2026-09-09
        XCTAssertEqual(InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 7, 0)), .tolling(direction: .eb, until: "9:30 AM"))
        XCTAssertEqual(InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 9, 30)), .free(next: "westbound tolls start 3:00 PM"))
        XCTAssertEqual(InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 16, 15)), .tolling(direction: .wb, until: "7:00 PM"))
        XCTAssertEqual(InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 4, 0)), .free(next: "eastbound tolls start 5:30 AM"))
        XCTAssertEqual(InsideBeltwaySchedule.status(at: eastern(2026, 9, 9, 20, 0)), .free(next: "eastbound tolls resume 5:30 AM tomorrow"))
    }

    func testFridayEveningAndWeekendPointToMonday() {
        XCTAssertEqual(InsideBeltwaySchedule.status(at: eastern(2026, 9, 11, 19, 0)), .free(next: "eastbound tolls resume Monday 5:30 AM"))
        XCTAssertEqual(InsideBeltwaySchedule.status(at: eastern(2026, 9, 12, 8, 0)), .free(next: "eastbound tolls resume Monday 5:30 AM"))
    }
}

final class FormattingTests: XCTestCase {
    func testEasternTime() {
        XCTAssertEqual(Formatting.easternTime(iso: "2026-09-09T14:03:00.000Z"), "10:03 AM EDT")
        XCTAssertEqual(Formatting.easternTime(iso: "2026-01-15T14:03:00Z"), "9:03 AM EST")
        XCTAssertEqual(Formatting.easternTime(iso: "not a date"), "not a date")
    }
}
