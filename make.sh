#!/bin/bash

print_green() {
    local message="$1"
    
    # Print the message in green color
    local green='\033[0;32m'
    local reset='\033[0m'
    echo -e "${green}${message}${reset}"
}

increase_patch_version() {
    local manifest_file="./manifest.json"
    
    # Read the current version from the manifest file
    local current_version=$(jq -r '.version' "$manifest_file")
    
    # Split the version into major, minor, and patch components
    IFS='.' read -r major minor patch <<< "$current_version"
    
    # Increase the patch version by 1
    patch=$((patch + 1))
    
    # Construct the new version string
    local new_version="$major.$minor.$patch"
    
    # Update the version in the manifest file
    jq --arg new_version "$new_version" '.version = $new_version' "$manifest_file" > tmp.json && mv tmp.json "$manifest_file"
    
    print_green "Patch version increased to $new_version"
}

create_package() {
    rm pimp-my-wolt.zip
    zip -r pimp-my-wolt ./* -x "*PR/*" -x "*pimp-my-wolt.zip*" -x "*make.sh*" -x "*.DS_Store*" -x "*.gitignore*" -x "*.idea*"
    print_green "Package created in: ./pimp-my-wolt"
}

increase_patch_version
create_package