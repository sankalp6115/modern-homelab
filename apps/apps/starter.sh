#!/bin/bash

SESSION="myapps"

# start a new detached session, first window for file server
tmux new-session -d -s $SESSION -n fileserver
tmux send-keys -t $SESSION:fileserver "cd /path/to/fileserver && ./start.sh" C-m

# new window for music player
tmux new-window -t $SESSION -n music
tmux send-keys -t $SESSION:music "cd /path/to/musicplayer && ./run.sh" C-m

# new window for a general shell
tmux new-window -t $SESSION -n shell

# attach to the session
tmux attach -t $SESSION