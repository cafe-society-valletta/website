/* SOCIETY TV (tv.html, /tv) — the live sets and their genres. Edit this file to add sets or rename genres.
   genres: the 8 labels on the TV's buttons, in order (button 1 → 8), exactly as Chef's labels read on the TV photo
           (assets/img/p-music-tv.webp). When Chef swaps in the TV with the final labels, read them off it and update this list.
   sets:   one per YouTube video, newest first. id = the YouTube video id (the part after watch?v= or youtu.be/).
           g = the genre numbers the set belongs to (1–8), as many as fit. An empty id shows "NO SIGNAL" static.
           channel (optional) = the YouTube channel name for the GUIDE; leave it out and it is read from YouTube. */
window.SOCIETY_TV = {
  genres: ["GENRE 1", "GENRE 2", "GENRE 3", "GENRE 4", "GENRE 5", "GENRE 6", "GENRE 7", "GENRE 8"],
  sets: [
    // { id:"YOUTUBE_ID", dj:"DJ NAME", title:"SET TITLE", date:"2026-09-12", channel:"CHANNEL", g:[1, 3] },
    // Riddle Radio — Riddle Records' playlist "Riddle Radio Sets" (every Tuesday at Café Society), Oct 2026:
    // https://www.youtube.com/playlist?list=PLiBKQogJ404mIjRC896HEprQ6bZer0Nl7  — dates = YouTube upload dates; genres not set yet
    { id:"iDchsJKOr2g", dj:"Jerm", title:"Riddle Records 019", date:"2025-12-03", channel:"Riddle Records", g:[] },
    { id:"0MsbneQiwY8", dj:"BOXFiSH", title:"Riddle Radio 018", date:"2025-11-26", channel:"Riddle Records", g:[] },
    { id:"HPZWBAAv5J0", dj:"Siria", title:"Riddle Records 017", date:"2025-11-19", channel:"Riddle Records", g:[] },
    { id:"F1yCKTp2Aj0", dj:"Peachy", title:"Riddle Radio 016", date:"2025-11-12", channel:"Riddle Records", g:[] },
    { id:"SLidGGDQSTo", dj:"Flapp", title:"Riddle Radio 015", date:"2025-11-05", channel:"Riddle Records", g:[] },
    { id:"TJdHnln-tVA", dj:"SUNTA", title:"Riddle Radio 014", date:"2025-09-29", channel:"Riddle Records", g:[] },
    { id:"SQ8-kDakRDk", dj:"Mavuu", title:"Riddle Radio 013", date:"2025-09-13", channel:"Riddle Records", g:[] },
    { id:"WTLjoDcLb7o", dj:"Andrea Giordani", title:"Riddle Radio 012", date:"2025-08-25", channel:"Riddle Records", g:[] },
    { id:"tsni1y1aTcQ", dj:"Psajla", title:"Riddle Radio 011", date:"2025-08-20", channel:"Riddle Records", g:[] },
    { id:"PaeevpIc1EQ", dj:"Sofried", title:"Riddle Radio 010", date:"2025-08-08", channel:"Riddle Records", g:[] },
    { id:"r5JI1Aw7680", dj:"Mihajlo D", title:"Riddle Radio 009", date:"2025-08-01", channel:"Riddle Records", g:[] },
    { id:"fbcpQPT5PJY", dj:"Ø-Paque", title:"Riddle Radio 008", date:"2025-07-21", channel:"Riddle Records", g:[] },
    { id:"xQUIdaVtWoE", dj:"Santisteban", title:"Riddle Radio 007", date:"2025-07-16", channel:"Riddle Records", g:[] },
    { id:"MmwOVXlE8pM", dj:"EMILS", title:"Riddle Radio 006", date:"2025-07-09", channel:"Riddle Records", g:[] },
    { id:"krXsmPtadZ4", dj:"Mongo", title:"Riddle Radio 005", date:"2025-07-04", channel:"Riddle Records", g:[] },
    { id:"k0l_fcpOyO4", dj:"Molario", title:"Riddle Radio 004", date:"2025-06-30", channel:"Riddle Records", g:[] },
    { id:"yB3AlKrlea4", dj:"Betży", title:"Riddle Radio 003", date:"2025-06-26", channel:"Riddle Records", g:[] },
    { id:"_W8vrXLgc6Y", dj:"DIP", title:"Riddle Radio 002", date:"2025-06-23", channel:"Riddle Records", g:[] },
    { id:"Ge0JZ81K5D4", dj:"Nazzer", title:"Riddle Radio 001", date:"2025-06-20", channel:"Riddle Records", g:[] }
  ]
};
