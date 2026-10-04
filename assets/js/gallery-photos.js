/* About → Galleries: photos per gallery.
   Files live in assets/img/gallery/<dir>/<dir>-NN.jpg (1600px) and <dir>-NN-t.jpg (560px thumb).
   To add photos: drop originals in the Mac "galleries" folder, re-run the resize, bump count.
   cover: photo number (from the contact sheet) used as the About tile; none yet = grey tile.
   coverCrop: true = use <dir>-cover.jpg, a hand-cropped 800px square of that photo. */
window.GALLERY_SETS = {
  "THE DRINKS": { dir: "the-drinks", count: 21, cover: 11, coverCrop: true },
  "THE FOOD": { dir: "the-food", count: 11, cover: 1 },
  "THE VIEW": { dir: "the-view", count: 7, cover: 2 },
  "THE VIBE": { dir: "the-vibe", count: 16, cover: 4 },
  "THE STAFF": { dir: "the-staff", count: 13, cover: 10 },
  "LOST SOULS CLUB": { dir: "lost-souls-club", count: 5, cover: 1 },
  "SOCIETEASE": { dir: "societease", count: 14, cover: 12 },
  "LET'S HAVE A KIKI": { dir: "lets-have-a-kiki", count: 14, cover: 1 },
  "QUEER LIKE VELVET": { dir: "queer-like-velvet", count: 23, cover: 10 },

  /* Photo Lab rolls — dl: base URL of the full-resolution originals (<dir>-NN.jpg), shown as a download button */
  "ROLL 01": { dir: "roll-01", count: 92, dl: "" },
  "ROLL 02": { dir: "roll-02", count: 32, dl: "" },
};
