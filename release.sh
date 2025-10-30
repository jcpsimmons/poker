#!/bin/bash

set -e

echo "🎴 Planning Poker Release Script"
echo "================================"

# Fetch all tags from remote
git fetch --tags

# Get the latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
echo "📌 Current latest tag: $LATEST_TAG"

# Parse version numbers (remove 'v' prefix)
VERSION=${LATEST_TAG#v}

# Split version into major.minor.patch
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

# Increment patch version
PATCH=$((PATCH + 1))

# Create new version
NEW_VERSION="v${MAJOR}.${MINOR}.${PATCH}"

echo "🚀 New version will be: $NEW_VERSION"
echo ""

# Prompt for confirmation
read -p "Create and push tag $NEW_VERSION? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Release cancelled"
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes:"
    git status -s
    echo ""
    read -p "Commit all changes first? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
        git push origin master
        echo "✅ Changes committed and pushed to master"
    else
        echo "❌ Please commit your changes first"
        exit 1
    fi
fi

# Create annotated tag
echo "📝 Creating tag $NEW_VERSION..."
git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"

# Push tag to trigger release
echo "🚀 Pushing tag to GitHub..."
git push origin "$NEW_VERSION"

echo ""
echo "✅ Release $NEW_VERSION created and pushed!"
echo "🔗 View release at: https://github.com/jcpsimmons/poker/releases/tag/$NEW_VERSION"
echo "⏳ GitHub Actions will build binaries shortly..."

