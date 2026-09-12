---
title: "The Atomic Echo Base earned its name"
description: "I put a Vapi voice assistant in a $20 M5Stack button. It worked, then it started interviewing itself, and the two knobs I reached for first could never have fixed that."
pubDatetime: 2026-09-12T17:00:00-07:00
draft: false
tags: ["vapi", "esp32", "voice", "hardware"]
---

[Vapi](https://vapi.ai) runs voice agents. I wanted one living in a physical button instead
of a browser tab: press it, talk, press again to hang up. The hardware is a $20 M5Stack
AtomS3R with a speaker-and-mic board clipped underneath. That board is called the Atomic
Echo Base. Hold that thought.

I figured the hard part would be the transport. Getting live audio off a microcontroller
and into a voice API is the bit with protocols in it, and protocols are where afternoons go.

The transport was fine. Then the assistant started talking to itself.

## There is no WebRTC path, which turned out to be good news

Everyone's mental model of a voice device is a WebRTC client, so that's where I started.
Vapi's WebRTC transport is Daily, and Daily has no embedded client: the SDKs are JS, Swift,
Kotlin, Python and Rust, and the core ships as a closed binary. There's no C client and no
protocol document to write one from.

Vapi's own 2025 workshop firmware for this exact board sidestepped that with an SDP
gateway, `staging-webrtc.vapi.ai`. I checked. It returns a Cloudflare 530 now, and
`webrtc.vapi.ai` doesn't resolve. That firmware won't connect today.

What's left is the `vapi.websocket` transport. One HTTPS POST creates the call and returns
a websocket URL; after that, binary frames are raw 16 kHz PCM in both directions and text
frames are JSON. No ICE, no DTLS, no SDP, no peer connection. It's uncompressed, so it's
256 kbit/s each way, about 16x what Opus would cost. On WiFi that's nothing. The whole
transport is one file, and it worked on the first real call: `POST /call` came back 201,
the socket opened in 470 ms, the first audio landed at 570 ms, and every inbound frame was
exactly 640 bytes, one 20 ms frame.

Press the button. Green screen. The assistant says hello.

## Then it interviewed itself

The firmware prints the transcripts Vapi sends back, `user:` and `assistant:` lines. This is
what the first conversation looked like:

```
assistant: Hello. Thank you for visiting. Could you please tell
user:      hello. Thank you for visiting. Could you please tell me your
assistant: Hello. Thank you for
user:      hello. Thank you for ringing
```

Every `user:` line is the previous `assistant:` line, 860 ms later. The speaker is 2 cm
from the microphone, the mic hears everything the speaker says, Vapi transcribes it as the
caller, and the assistant politely answers itself. It kept this up for a minute and forty
seconds, then said goodbye and hung up on itself.

The Echo Base. I should have taken the hint.

There is an acoustic echo canceller in the audio pipeline, and I'd assumed it was doing its
job. The chip in the board even wires a copy of the speaker signal into the right channel of
the mic stream specifically so the canceller has a reference to subtract. I read the
register back off the chip: `0x44 = 0x58`, reference enabled. I played a tone and measured
the reference channel: silent at rest, loud with the tone. The canceller was configured,
fed, and running. And cancelling nothing.

## I reached for the wrong knobs, twice, then the right one, which also failed

My first theory was that the mic was clipping. A saturated signal is nonlinear and a linear
canceller can't subtract it. I stated this confidently, then measured it: the peak was
25355 out of a possible 32767. Hot, not clipped. Theory one lasted about a minute.

Then I measured the thing that mattered. With the speaker at its default volume, the echo
arriving at the mic was **8.8 dB louder than the canceller's own reference signal.** A
canceller can't converge on an echo that dominates the thing it's subtracting from it. That
was real, and it pointed at a fix: the codec boots the mic at 30 dB of gain, which is a lot
for a mic 2 cm from a speaker. I cut it to 18 dB. The echo vanished.

So did I. Vapi got nothing. The assistant said "Are you still there?" three times and gave
up. Zero `user:` lines in the log. The speaker is 2 cm from the mic and I'm 40 cm from it,
so cutting the mic's gain took far more off my voice than off the echo.

Fine: put the level back *after* the canceller, where the echo has already been removed.
12 dB of digital makeup gain, applied downstream. My voice came back. So did the echo, now
with a clipping warning on top.

That was the moment the arithmetic finally landed. Sort the knobs by what they do to the
*ratio* of echo to my voice at the microphone, because that ratio is the only thing the
speech-to-text cares about:

| knob | echo | my voice | ratio |
|---|---|---|---|
| analog mic gain | down | down | unchanged |
| digital makeup gain | down | down | unchanged |
| speaker volume | down | same | better |
| the canceller | down | same | better |

**Both gain knobs scale the echo and my voice by exactly the same amount.** They can never
separate the two. They only trade absolute level against whether the canceller converges,
and I'd spent two flashes and two billed calls turning them, with the table sitting right
there.

So, the one knob left that I controlled: speaker volume, 85 down to 60. That's 12.5 dB less
echo reaching the mic and no change to how loudly I'm speaking. This one had to work.

The next call transcribed the assistant's own voice as the caller again. Just quieter.

Which settles it. If 12.5 dB of ratio isn't enough, the canceller's residual on this board
is too shallow for any setting to hide, and the answer isn't to cancel the echo better. It's
to stop listening while the echo is happening.

## The API that always said zero

The plan: hard-mute the microphone whenever the assistant is audible. That's a real
technique, and the device has an advantage a canceller doesn't. I write every inbound
frame to the speaker myself. I know exactly what the far end is about to say. The only hard
part is *when*, because playback lags the websocket by a few hundred milliseconds of
buffering, and muting the mic at the moment the frame *arrives* covers the wrong window.

The audio library has a function that reports how much is buffered:
`av_render_get_audio_fifo_level()`. I built the gate on it and it made things worse. I
added telemetry, which I should have done two fixes earlier, and the telemetry said:

```
fifo 0 ms (max 0)
fifo 0 ms (max 0)
fifo 0 ms (max 0)
```

Every call. Zero. The gate had no idea when anything would play, so it muted from the
moment a frame arrived, for a fixed hangover, then opened again while the speaker was still
mid-sentence. Across a call it was shut anywhere between 12% and 99% of frames with no
relationship to whether the assistant was speaking. A correct design, aimed at the wrong
moment, looks exactly like a wrong design.

## I know when the speaker will speak, because I fed it

The fix needs no API at all. I hand the speaker bytes and I know the sample rate, so I can
keep a clock: the wall-clock time at which everything queued so far will have finished
playing. Each new frame starts at the later of that clock and now, and advances it by the
frame's duration. If the frame is loud, the mic stays muted until that clock plus a tail.
Bytes written and the sample rate are enough to know exactly when a sound comes out.

That clock reports a lead of 142 to 300 ms on this board. Which is the real number the
library function was reporting as zero.

```
gate: shut 101/101 | playout lead 177 ms | mic pk POST-gate 0     <- assistant speaking
gate: shut   0/101 | playout lead 187 ms | mic pk POST-gate 1773  <- my turn
```

One hundred and one frames out of one hundred and one muted while the assistant talks,
with a post-gate microphone peak of zero. Then it opens, and I'm the only voice in the
room. The next conversation went like this:

```
user:      Oh, I am free. I'm here to see a puppy.
assistant: your name is Free, and you're here to see a puppy. Is that correct?
user:      Yes.
```

It misheard my name. It did not mishear its own.

## What it can't do

You can't interrupt it. While the assistant is speaking the mic is dead, so talking over
it does nothing. You tap the button to cut it off. On hardware where the speaker sits 2 cm
from the mic and the canceller is this weak, echo-free and interruptible are not both on
the menu, and I'd rather have a device that hears me than one I can interrupt.

The mute is the fix. The gain work still matters at the edges, for the fraction of a
second where the gate is opening and the canceller is the only thing between the speaker
and the transcript, so the final setup is a 24 dB mic, 6 dB of makeup gain applied after
the canceller, and the speaker at 90. All of it measured, none of it guessed, and the boot
probe that produced the numbers is in the repo for the next enclosure.

The thing I actually learned isn't about echo. Three fixes in a row failed because I
reasoned from a model of what should be happening. The one that worked came from a log
line that said what was happening. I'll instrument first next time. I say that every time.

The firmware, the measurements, and the three wrong turns written up so nobody repeats
them are at
[github.com/ramsrib/vapi-atoms3r-voice](https://github.com/ramsrib/vapi-atoms3r-voice).
