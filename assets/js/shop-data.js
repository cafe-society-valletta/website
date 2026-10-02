/* The Society Collection — product data.
   PLACEHOLDERS for now. The shape mirrors Shopify's Storefront API (handle, title, price,
   images[], options/variants) so these can later be swapped for live Shopify products;
   Shopify then only handles the bag/checkout and stock. Photos: images[] = file paths
   (empty → placeholder tiles). */
// While the shop isn't open, every product photo carries a COMING SOON band (set to false to remove).
window.SHOP_COMING_SOON = true;

window.SHOP_CATEGORIES = [
  { id:"apparel",   title:"APPAREL" },
  { id:"artwork",   title:"ARTWORK & PRINTS" },
  { id:"terroir",   title:"TOOLS WITH TERROIR",
    // write-up shown above the products: a dictionary entry, then body paragraphs (Chef's text)
    intro:{
      entry:{
        word:"terroir", syll:"ter·roir", ipa:"/tɛˈʁwɑːʁ/", pos:"noun",          // shown as in a printed dictionary: ter·roir /…/ noun 1 … ORIGIN …
        origin:'from Old French <i>terre</i> (earth or land), based on Latin <i>territorium</i> (territory), with the French suffix <i>-oir</i> (denoting a specific place associated with an object or activity)',
        senses:["The complete natural environment in which a particular wine, spirit, or agricultural product is produced, including factors such as soil, topography, and climate, which impart a distinctive character to it."]
      },
      body:[
        "Although usually used to discuss environmental indicators in wines and spirits, it is also worth contemplating the terroir of the tools of the trade that bartenders and connoisseurs use to serve those drinks and the vessels that they are served in.",
        "Throughout history and across geography, varying tastes and drinking cultures have called for innovative and perfected techniques. Bartenders adapted (as we always do), equipped by skilled artisans of glass and crystal work, metallurgy, and industrial design.",
        "Those bartenders’ and artisans’ legacy and legend are infused into beautiful, functional works of art that can be handled and enjoyed again and again."
      ]
    } },
  { id:"kits",      title:"BAR TOOL KITS" },
  { id:"retail",    title:"RETAIL PRODUCTS" }
];
window.SHOP_PRODUCTS = [
  { handle:"apparel-test-1",      cat:"apparel", title:"Test Item 1",            price:30, sizes:["S","M","L","XL"], images:[], photos:3,
    desc:"Placeholder product — details to come." },
  { handle:"apparel-test-2",cat:"apparel", title:"Test Item 2",      price:60, sizes:["S","M","L","XL"], images:[], photos:3,
    desc:"Placeholder product — details to come." },
  { handle:"apparel-test-3",        cat:"apparel", title:"Test Item 3",              price:45, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"apparel-test-4",      cat:"apparel", title:"Test Item 4",            price:25, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"apparel-test-5",             cat:"apparel", title:"Test Item 5",               price:18, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"artwork-test-1",cat:"artwork", title:"Test Item 1", price:40, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"artwork-test-2",  cat:"artwork", title:"Test Item 2",        price:35, sizes:["A4","A3"], images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"artwork-test-3",       cat:"artwork", title:"Test Item 3",       price:45, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"artwork-test-4",       cat:"artwork", title:"Test Item 4",       price:25, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"terroir-test-1",         cat:"terroir", title:"Test Item 1",               price:22, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"terroir-test-2",           cat:"terroir", title:"Test Item 2",                 price:20, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"terroir-test-3",         cat:"terroir", title:"Test Item 3",     price:24, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"terroir-test-4",     cat:"terroir", title:"Test Item 4",           price:38, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"kits-test-1",         cat:"kits",    title:"Test Item 1",           price:90, images:[], photos:3,
    desc:"Placeholder product — details to come." },
  { handle:"kits-test-2",       cat:"kits",    title:"Test Item 2",             price:65, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"kits-test-3",          cat:"kits",    title:"Test Item 3",                price:140, images:[], photos:3,
    desc:"Placeholder product — details to come." },
  { handle:"retail-test-1",      cat:"retail",  title:"Test Item 1",       price:32, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"retail-test-2",        cat:"retail",  title:"Test Item 2",              price:24, images:[], photos:2,
    desc:"Placeholder product — details to come." },
  { handle:"retail-test-3",          cat:"retail",  title:"Test Item 3",          price:18, images:[], photos:2,
    desc:"Placeholder product — details to come." }
];
