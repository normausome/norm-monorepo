import XCTest
@testable import VAExpressTolls

final class CatalogTests: XCTestCase {
    func testBundledCatalogHasFiveCorridors() {
        let catalog = CorridorCatalog.bundled
        XCTAssertEqual(catalog.corridors.count, 5)
        XCTAssertEqual(
            catalog.corridors.map(\.id),
            [.express495, .express395, .express95, .inside66, .outside66]
        )
        XCTAssertEqual(catalog.defaultCorridor, .express495)
        XCTAssertEqual(Set(CorridorId.allCases).count, 5)
    }

    func testInsideBeltwaySupportsHistorical() {
        XCTAssertTrue(CorridorCatalog.bundled[.inside66].supportsHistorical)
        XCTAssertFalse(CorridorCatalog.bundled[.express495].supportsHistorical)
    }
}
