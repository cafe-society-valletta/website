/* The Society Collection — product data.
   PLACEHOLDERS for now. The shape mirrors Shopify's Storefront API (handle, title, price,
   images[], options/variants) so these can later be swapped for live Shopify products;
   Shopify then only handles the bag/checkout and stock. Photos: images[] = file paths
   (empty → placeholder tiles). */
window.SHOP_CATEGORIES = [
  { id:"apparel",   title:"APPAREL" },
  { id:"artwork",   title:"ARTWORK & PRINTS" },
  { id:"terroir",   title:"TOOLS WITH TERROIR" },
  { id:"kits",      title:"BAR TOOL KITS" },
  { id:"retail",    title:"RETAIL PRODUCTS" }
];
window.SHOP_PRODUCTS = [
  { handle:"society-tee",      cat:"apparel", title:"Society Tee",            price:30, sizes:["S","M","L","XL"], images:[], photos:3,
    desc:"Heavyweight cotton tee with the Society Collection mark on the chest." },
  { handle:"bottle-row-hoodie",cat:"apparel", title:"Bottle-Row Hoodie",      price:60, sizes:["S","M","L","XL"], images:[], photos:3,
    desc:"Brushed-back hoodie with the cyanotype bottle-row print across the back." },
  { handle:"bar-apron",        cat:"apparel", title:"Bar Apron",              price:45, images:[], photos:2,
    desc:"Waxed canvas bib apron, as worn behind the bar on St John's Street." },
  { handle:"society-cap",      cat:"apparel", title:"Society Cap",            price:25, images:[], photos:2,
    desc:"Six-panel washed cotton cap." },
  { handle:"tote",             cat:"apparel", title:"Tote Bag",               price:18, images:[], photos:2,
    desc:"Heavy canvas tote, screen printed." },
  { handle:"cyanotype-bottles",cat:"artwork", title:"Cyanotype Bottles — A3", price:40, images:[], photos:2,
    desc:"Hand-pulled cyanotype print of the bottle row. Signed and numbered." },
  { handle:"photo-lab-print",  cat:"artwork", title:"Photo Lab Print",        price:35, sizes:["A4","A3"], images:[], photos:2,
    desc:"A frame from the Photo Lab film rolls, printed on matte archival paper." },
  { handle:"stereogram",       cat:"artwork", title:"Stereogram Print",       price:45, images:[], photos:2,
    desc:"A hidden-image stereogram print. Look through it." },
  { handle:"poster-set",       cat:"artwork", title:"Event Poster Set",       price:25, images:[], photos:2,
    desc:"Three posters from nights at Café Society." },
  { handle:"barspoon",         cat:"terroir", title:"Barspoon",               price:22, images:[], photos:2,
    desc:"Weighted barspoon with a twisted shaft." },
  { handle:"jigger",           cat:"terroir", title:"Jigger",                 price:20, images:[], photos:2,
    desc:"Japanese-style double jigger, 30 / 60 ml." },
  { handle:"strainer",         cat:"terroir", title:"Hawthorne Strainer",     price:24, images:[], photos:2,
    desc:"Tight-coil hawthorne strainer." },
  { handle:"mixing-glass",     cat:"terroir", title:"Mixing Glass",           price:38, images:[], photos:2,
    desc:"Seamless mixing glass, 600 ml." },
  { handle:"home-kit",         cat:"kits",    title:"Home Bar Kit",           price:90, images:[], photos:3,
    desc:"Shaker, jigger, barspoon and strainer in a canvas roll." },
  { handle:"travel-kit",       cat:"kits",    title:"Travel Kit",             price:65, images:[], photos:2,
    desc:"The essentials, packed small." },
  { handle:"pro-kit",          cat:"kits",    title:"Pro Kit",                price:140, images:[], photos:3,
    desc:"Everything we use behind the bar." },
  { handle:"house-amaro",      cat:"retail",  title:"House Amaro 50cl",       price:32, images:[], photos:2,
    desc:"Our house amaro, bottled." },
  { handle:"syrup-set",        cat:"retail",  title:"Syrup Set",              price:24, images:[], photos:2,
    desc:"Three house syrups." },
  { handle:"bitters",          cat:"retail",  title:"House Bitters",          price:18, images:[], photos:2,
    desc:"Aromatic bitters, 100 ml." }
];
