#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to display usage information
usage() {
  echo "Usage: $0 [-r <repository_url>] [-b <branch>] [-d <destination_directory>]"
  echo ""
  echo "  -r | --repo        Git repository URL (default: git@github.com:raycast/extensions.git)"
  echo "  -b | --branch      Branch to clone (default: main)"
  echo "  -d | --dest        Destination directory (default: ../raycast)"
  echo "  -h | --help        Display this help message"
  exit 1
}

# Default values
REPO_URL="git@github.com:raycast/extensions.git"
BRANCH="main"
DEST_DIR="./repo"

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    -r|--repo)
      REPO_URL="$2"
      shift 2
      ;;
    -b|--branch)
      BRANCH="$2"
      shift 2
      ;;
    -d|--dest)
      DEST_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown parameter passed: $1"
      usage
      ;;
  esac
done

# Check if the destination directory already exists
if [ -d "$DEST_DIR" ]; then
  echo "Error: Destination directory '$DEST_DIR' already exists."
  echo "Please choose a different directory or remove the existing one."
  exit 1
fi

# Clone the repository with the specified options
echo "Cloning repository..."
git clone --depth=1 --filter=blob:none --sparse -b "$BRANCH" "$REPO_URL" "$DEST_DIR"

# Navigate to the cloned repository
cd "$DEST_DIR"

# Initialize sparse-checkout if not already enabled
# (This is redundant with --sparse, but included for safety)
git sparse-checkout init --cone

# Set sparse-checkout to include only all package.json files
echo "Setting up sparse-checkout to include only package.json files..."
git sparse-checkout set '**/package.json' --skip-checks

# ls-files
echo "Listing the checked-out files..."
git ls-files '**/package.json' > checked_out_files.txt

git sparse-checkout set $(cat checked_out_files.txt) --skip-checks

echo "======= NOTE ======="
echo "The repository has been cloned with only the package.json files."
echo "This means not the whole script will work, because it can't find swift packages."
echo "===================="
