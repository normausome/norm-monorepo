// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TollsKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "TollsKit", targets: ["TollsKit"]),
    ],
    targets: [
        .target(name: "TollsKit"),
        .testTarget(name: "TollsKitTests", dependencies: ["TollsKit"]),
    ]
)
