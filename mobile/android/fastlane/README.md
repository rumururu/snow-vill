fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android build

```sh
[bundle exec] fastlane android build
```

Build the release AAB

### android internal

```sh
[bundle exec] fastlane android internal
```

Build and upload to the internal testing track (pass draft:true while the app is still a draft app)

### android images

```sh
[bundle exec] fastlane android images
```

Upload store images only (fastlane/metadata/android/<locale>/images, staged by build_marketing.py --to-fastlane). Text goes through tools/store/listing.py

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
