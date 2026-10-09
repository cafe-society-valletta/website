/* Meet Me at Society — the 8-bit emoji library (Chef, Oct 2026). Used by meetme.js (the [☺] picker in the post toolbar and
   the post window) and mmadmin.html (SYSOP console). Each emoji is a 9×9 pixel grid ("X" = lit phosphor pixel), drawn as a
   crisp SVG in the screen's green. In a post body an emoji is stored as plain text, :name: — e.g. :heart: — and only names
   in this list turn into pictures. To add one: add a name + 9 rows of 9 characters below. */
(function(){
  const E = {   // grouped: faces / hearts & stars / bar & food / party & music / nature & spooky / signs
    smile:      ["..XXXXX..",".X.....X.","X.......X","X..X.X..X","X.......X","X.X...X.X","X..XXX..X",".X.....X.","..XXXXX.."],
    grin:       ["..XXXXX..",".X.....X.","X..X.X..X","X.......X","X.XXXXX.X","X.X...X.X","X..XXX..X",".X.....X.","..XXXXX.."],
    laugh:      ["..XXXXX..",".X.....X.","X.......X","X.XX.XX.X","X.......X","X.XXXXX.X","X.XXXXX.X",".X.XXX.X.","..XXXXX.."],
    wink:       ["..XXXXX..",".X.....X.","X.......X","X.XX.X..X","X.......X","X.X...X.X","X..XXX..X",".X.....X.","..XXXXX.."],
    love:       ["..XXXXX..",".X.....X.","XX.X.X.XX","XXXX.XXXX","X.X...X.X","X.......X","X.X...X.X",".X.XXX.X.","..XXXXX.."],
    kiss:       ["..XXXXX..",".X.....X.","X..X.X..X","X.......X","X...XX..X","X....X..X","X...XX..X",".X.....X.","..XXXXX.."],
    tongue:     ["..XXXXX..",".X.....X.","X..X.X..X","X.......X","X.XXXXX.X","X...X.X.X","X...XXX.X",".X.....X.","..XXXXX.."],
    cool:       ["..XXXXX..",".X.....X.","XXXXXXXXX","X.XX.XX.X","X.......X","X.X...X.X","X..XXX..X",".X.....X.","..XXXXX.."],
    thinking:   ["..XXXXX..",".X.....X.","X.X..XX.X","X..X..X.X","X.......X","X...XXX.X","X.......X",".X.....X.","..XXXXX.."],
    shock:      ["..XXXXX..",".X.....X.","X..X.X..X","X.......X","X...X...X","X..X.X..X","X...X...X",".X.....X.","..XXXXX.."],
    sleepy:     ["..XXXXX..",".X.....X.","X.......X","X.XX.XX.X","X.......X","X.......X","X..XXX..X",".X.....X.","..XXXXX.."],
    sad:        ["..XXXXX..",".X.....X.","X.......X","X..X.X..X","X.......X","X..XXX..X","X.X...X.X",".X.....X.","..XXXXX.."],
    cry:        ["..XXXXX..",".X.....X.","X..X.X..X","X.X...X.X","X.X...X.X","X.......X","X..XXX..X",".XX...XX.","..XXXXX.."],
    angry:      ["..XXXXX..",".X.....X.","XXX...XXX","X..X.X..X","X..X.X..X","X.......X","X..XXX..X",".XX...XX.","..XXXXX.."],
    heart:      [".........",".XX...XX.","XXXX.XXXX","XXXXXXXXX","XXXXXXXXX",".XXXXXXX.","..XXXXX..","...XXX...","....X...."],
    brokenheart:[".........",".XX...XX.","XXXX.XXXX","XXX.XXXXX","XXXX.XXXX",".XX.XXXX.","..XX.XX..","...X.X...","....X...."],
    star:       ["....X....","....X....","...XXX...","XXXXXXXXX",".XXXXXXX.","..XXXXX..","..XX.XX..",".XX...XX.",".X.....X."],
    sparkle:    ["....X....","....X....","..X.X.X..","...XXX...","XXXX.XXXX","...XXX...","..X.X.X..","....X....","....X...."],
    fire:       ["....X....","...XX....","...XXX.X.","..XXXXXX.",".XXX.XXXX",".XX...XXX","XX.....XX","XX.....XX",".XXXXXXX."],
    bolt:       ["....XXXX.","...XXXX..","..XXXX...",".XXXXXXX.","....XXX..","...XXX...","..XX.....",".XX......","X........"],
    cocktail:   ["XXXXXXXXX",".XXXXXXX.","..XXXXX..","...XXX...","....X....","....X....","....X....","....X....","..XXXXX.."],
    wine:       [".XXXXXXX.",".X.....X.",".XXXXXXX.","..XXXXX..","...XXX...","....X....","....X....","....X....","..XXXXX.."],
    champagne:  ["...X.X...","....X..X.","...XXX...","...XXX...","...XXX...","....X....","....X....","....X....","..XXXXX.."],
    beer:       [".XXXXX...","XXXXXXX..","X.....XXX","X.X.X.X.X","X.X.X.X.X","X.X.X.X.X","X.....XXX","X.....X..","XXXXXXX.."],
    shot:       [".X.....X.",".X.....X.",".X.....X.",".XXXXXXX.","..XXXXX..","..XXXXX..","..XXXXX..","..XXXXX..","........."],
    coffee:     ["..X.X....",".X.X.....","..X.X....","XXXXXXX..","XXXXXXXXX","XXXXXXX.X","XXXXXXXXX",".XXXXX...","XXXXXXXX."],
    oyster:     [".........",".XXXXXXX.","X.X.X.X.X","XXXXXXXXX","X.......X","X...XX..X","X...XX..X",".X.....X.","..XXXXX.."],
    lemon:      ["XXXXXXXXX","XX.X.X.XX",".X.X.X.X.",".XX.X.XX.","..X.X.X..","..XX.XX..","...X.X...","...XXX...","....X...."],
    cherry:     ["....XX...","....X....","...X.X...","..X...X..",".X.....X.","XXX...XXX","XXX...XXX","XXX...XXX","........."],
    pizza:      ["XXXXXXXXX","XXXXXXXXX",".XX.XXXX.",".XXXX.XX.","..X.XXX..","..XXXXX..","...XX.X..","...XXX...","....X...."],
    cake:       ["....X....","....X....","....X....",".XXXXXXX.","X.X.X.X.X","XXXXXXXXX","X.......X","XXXXXXXXX","XXXXXXXXX"],
    note:       ["...XXXXXX","...XXXXXX","...X....X","...X....X","...X....X",".XXX..XXX","XXXX.XXXX","XXXX.XXXX",".XX...XX."],
    mic:        ["...XXX...","..XXXXX..","..X.X.X..","..XXXXX..","...XXX...","....X....","....X....","...XXX...","........."],
    headphones: ["..XXXXX..",".X.....X.","X.......X","X.......X","XX.....XX","XXX...XXX","XXX...XXX","XXX...XXX",".X.....X."],
    vinyl:      ["..XXXXX..",".XX...XX.","XX.XXX.XX","X.X...X.X","X.X.X.X.X","X.X...X.X","XX.XXX.XX",".XX...XX.","..XXXXX.."],
    guitar:     [".......XX","......XX.",".....X...","..XXX....",".XXXXX...","XX.XXX...","XXXXX....",".XXX.....","........."],
    disco:      ["....X....","..XXXXX..",".X.X.X.X.","XXXXXXXXX","X.X.X.X.X","XXXXXXXXX",".X.X.X.X.","..XXXXX..","........."],
    dancer:     ["...XXX...","X..XXX..X",".X..X..X.","..XXXXX..","....X....","...X.X...","..X...X..",".X.....XX","X........"],
    balloon:    ["..XXXXX..",".XXXXXXX.",".XXXXXXX.",".XXXXXXX.","..XXXXX..","...XXX...","....X....",".....X...","....X...."],
    gift:       ["..X...X..","...X.X...","XXXXXXXXX","X...X...X","XXXXXXXXX",".X..X..X.",".X..X..X.",".X..X..X.",".XXXXXXX."],
    crown:      [".........","X...X...X","XX.XXX.XX","XXXXXXXXX","XXXXXXXXX","X.X.X.X.X","XXXXXXXXX","XXXXXXXXX","........."],
    camera:     [".........","..XXX....","XXXXXXXXX","X..XXX..X","X.X...X.X","X.X...X.X","X..XXX..X","XXXXXXXXX","........."],
    sun:        ["X...X...X",".X.....X.","...XXX...","..XXXXX..","XXXXXXXXX","..XXXXX..","...XXX...",".X.....X.","X...X...X"],
    moon:       ["..XXXX...",".XXX.....","XXX......","XX.......","XX.......","XXX......",".XXX....X","..XXXXXX.","...XXXX.."],
    rainbow:    [".........","..XXXXX..",".X.....X.","X..XXX..X","X.X...X.X","X.X...X.X","X.X...X.X",".........","........."],
    flower:     ["..X...X..",".XXX.XXX.","..XX.XX..","....X....","..XX.XX..",".XXX.XXX.","..X.X.X..","....X....","....X...."],
    cat:        ["X.......X","XX.....XX","XXXXXXXXX","XX.XXX.XX","XXXXXXXXX","XXXX.XXXX",".XXXXXXX.","..XXXXX..","........."],
    ghost:      ["..XXXXX..",".XXXXXXX.","XXXXXXXXX","XX..X..XX","XX..X..XX","XXXXXXXXX","XXXXXXXXX","XXXXXXXXX","X.XX.XX.X"],
    skull:      ["..XXXXX..",".XXXXXXX.","XXXXXXXXX","X..XXX..X","X..XXX..X","XXXX.XXXX",".XXXXXXX.","..X.X.X..","..X.X.X.."],
    thumbsup:   ["....X....","...XX....","...XX....","XXXXXXXX.","XX.....XX","XX....XX.","XX.....XX","XX....XX.","XXXXXXX.."],
    check:      [".........","........X",".......XX","......XX.","X....XX..","XX..XX...",".XXXX....","..XX.....","........."],
    cross:      ["X.......X","XX.....XX",".XX...XX.","..XX.XX..","...XXX...","..XX.XX..",".XX...XX.","XX.....XX","X.......X"],
    question:   ["..XXXXX..",".XX...XX.",".......XX","......XX.","....XX...","....XX...",".........","....XX...","....XX..."],
    exclaim:    ["...XXX...","...XXX...","...XXX...","...XXX...","....X....","....X....",".........","...XXX...","...XXX..."],
    peace:      ["..XXXXX..",".X..X..X.","X...X...X","X...X...X","X..XXX..X","X.X.X.X.X","XX..X..XX",".X..X..X.","..XXXXX.."],
    hundred:    [".........","X.XXX.XXX","X.X.X.X.X","X.X.X.X.X","X.X.X.X.X","X.XXX.XXX",".........","XXXXXXXXX","..XXXXXXX"]
  };
  const cache = {};
  const src = name => { const rows = E[name]; if(!rows) return ""; if(cache[name]) return cache[name];
    let r = ""; rows.forEach((row, y) => [...row].forEach((c, x) => { if(c === "X") r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
    return cache[name] = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 9" shape-rendering="crispEdges" fill="#7dff7d">${r}</svg>`); };
  // already-escaped text in → :name: codes swapped for <img> (unknown names are left as typed)
  const swap = (html, cls) => html.replace(/:([a-z]+):/g, (m, n) => E[n] ? `<img class="${cls || "mmb-emo"}" src="${src(n)}" alt=":${n}:" title=":${n}:">` : m);
  window.MM_EMOJI = { names:Object.keys(E), src, swap };
})();
