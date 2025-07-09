# Virtual Piano

This originally started out as a small project shortly after I finished my coding bootcamp. I wanted to play around with the Web Audio API and realized that you could target SVG elements just like you could HTML elements. I then toyed around with the idea of adding the capability of recording inputs on the piano, but coming up with a data structure that could capture the richness of music and an appropriate user experience for editing music eluded me at the time.

Almost exactly six years later, my coworkers and I were setting up some cloud infrastructure and we talked about netmasks. They mentioned [bitmasks](https://en.wikipedia.org/wiki/Mask_(computing)) so I went to look that up and found out about [bit manipulation](https://en.wikipedia.org/wiki/Bit_manipulation). It's not used so much today unless you're really trying to optimize things, do data compression, implement codecs, and so on. I thought about writing a JPEG decoder but I think that might be a bit beyond me at the moment. I then settled on writing a [MIDI parser](https://github.com/chuynh18/midijs). While this MIDI parser is far inferior to freely-available libraries, it does successfully deserialize simple MIDI files and is integrated into this keyboard. I've found [the MIDIs by Terry Smythe](https://archive.org/details/terrysmythe.ca-archive) to work (naturally so, as I used those MIDI files to validate my work). The MIDIs by Smythe on [kunstderfuge.com](https://kunstderfuge.com/midi.htm) also work.

Piano sounds from https://theremin.music.uiowa.edu/MISpiano.html

Piano SVG from... I forgot, but it only had 12 keys so I duplicated them in Inkscape to get all 88 keys

You can see the very early [proof-of-concept here](https://chuynh18.github.io/tones-test/sine.html).
