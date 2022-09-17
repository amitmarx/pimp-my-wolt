#!/bin/bash
rm pimp-my-wolt.zip
zip -r pimp-my-wolt ./* -x "*PR/*" -x "*pimp-my-wolt.zip*" -x "*make.sh*" -x "*.DS_Store*" -x "*.gitignore*" -x "*.idea*" -x "*node_modules*"
