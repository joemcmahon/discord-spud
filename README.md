# Spud - the RadioSpiral Discord bot

Spud was originally a Slack bot using the SLAPP library to communicate and
provide services that Slack either didn't, or didn't do well.

 - List of active users

Extra station-only services:

 - Now playing command (also listed the number of current listeners)

To make him somewhat more amusing, Spud was also given a bit of personality
by making hiim monitor for mentions and responding some of the time.

Spud provided these services by running an Icecast monitor for the stream,
posting messages to Slack via a webhook when the track changes, and monitoring
the number of users currently listening.

The active Slack users command was always finicky; Slack changed the APIs that
were used to collect the data several times, and they were never particularly
accurate.

# The switch to Discord

The Mountain Skies 2021 online music festival presented us with a problem:
Slack does not make it easy to join. You need to have an invite to join Slack.
Worse, the API we were using to generate auto-invites broke sometime last
year, making it necessary to hand-invite people via email.

This is a particular problem when you want the barrier to joining the chat to
be as low as possible; partly because you want the audience to join in without
friction, and performers, who are busy trying to get ready to play, do not
want to have to negotiate a time-intensive process (it is a sad truth that
most performers really aren't that interested in joining a chat server until
they're required to).

Discord, on the other hand, has very much an open-door policy: if you have the
invite URL, you can join without any hassle at all; you don't even have to
set up an account.

We set up the Discord, and it was clear that it was a much more friendly
option within a couple of hours, and it was clear we'd want to move to it
going forward.

We did want to keep all the functions we had before -- luckily Discord
provided some of them out of the box:

 - The active users show up fine in the desktop client with no extra effort
   on our part.
 - Easy sign-up (no special server or email dance required)

This meant that the only thing we'd really need was the "now-playing"
monitor.

# Porting the code

The infrastructure required for a Discord Node bot is significantly less
than is required for a SLAPP bot. Essentially you only need an `index.js`
that contains the necessary code to run your bot, and a package.json to hold
the required support libraries.

I used the example `discord-botkit` code from the Magic 8 Ball example found
[here](https://chatbotslife.com/creating-a-magic-8-ball-for-discord-1-2-28b1c7ecd277)
and [here](https://chatbotslife.com/creating-a-magic-8-ball-for-discord-in-node-js-and-botkit-part-2-2-97b505a7b843).
We didn't need a very sophisticated bot, so this code was a great base to work
from. 

This sufficed to get the base bot in place (Spud's snarking when spoken to
directly replaced the Magic 8 Ball replies). I was pretty much able to lift
the Icecast monitoring wholesale from the old code, bar the posting to
Discord; I was still using a webhook, but the payload needed to switch
slightly.  I decided to change the implementation a bit by having Spud post
the track changes to a special `#now-playing` channel, to prevent him
cluttering up the conversation and scrolling previous shows off the screen.
We tend to have a fairly active chat during shows, and posting the tracks
to the same channel made it hard to scroll back and catch up.

I was able to add a few more commands to show the listener count and show
the current track only; I eliminated the `history` command, as the `#now-playing`
channel does a better job. The `#now-playing` entries were also extended with
a timestamp to make it easier to figure out things like "what was playing at 2PM that was
so good?".

# Building and running under Docker

We've moved from running services on a wildly disparate set of servers to
having as much as possible available on a single server. This is partially to
decrease costs, and partially to decrease complexity.

To decrease the problems with deploying possibly-conflicting services on a
single server, and to decrease deployment complexity overall, we've opted to
containerize our services.

For Spud, that means we do the following:

 - We use a .env file and the Node.js `dotenv` package to make setting up the environment simpler. `.env` is in the `.gitignore` file to ensure we don't check in any tokens, etc.
 - We have a `Dockerfile` that encapsulates the build and deployment info.

## Developing and testing Spud

We use `yarn` for our package namagement, so adding new packages should be
done with `yarn add`.

To run Spud in test mode just do `node index.js`. You will need to edit `.env`
to temporarily use a different port; we should make this less error-prone in
the future, as it's easy to forget and `docker build` with the wrong port this
way.

## Running Spud from the command line

When you are ready to switch to a new version of Spud, do the following:

 - Verify the port is correct in `.env`. Spud's standard port should be 8019.
 - `docker build . -t spud:latest`
 - `docker ps`
 - `docker kill <old Spud instance>`
 - `docker run --net=host spud:latest`
 - `netstat -a|grep 8019` to verify Spud is up and listening on 8019
 - `curl localhost:8019/api/health` to do an initial health check

# Conclusions

 - We should have switched earlier; Discord's a much better solution for less-sophisticated users
   and considerably less cognitive load for the admins and the DJs.
 - Discord's easier to work with than Slack is, so far, providing more and
   better APIs to get the data that we really want.
