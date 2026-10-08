/* =========================================================
   /.netlify/functions/shop — The Society Collection ↔ Shopify (headless).

   Shopify (thesocietycollection.myshopify.com) keeps the products, stock, payments and checkout; the site
   draws everything itself (assets/js/shop.js). This function talks to Shopify's Storefront API so the
   browser never needs the token.

   Netlify env (set by Chef — never in the repo):
     SHOPIFY_STOREFRONT_TOKEN   public Storefront access token from Shopify's "Headless" sales channel
     SHOPIFY_STORE_DOMAIN       thesocietycollection.myshopify.com

   GET                → { products:[{ handle, cat, title, price, images[], sizes[], soldOutSizes[], available,
                          stock, desc, variants:[{ id, size, available, stock }] }] }
                        cat = the site category its Shopify collection maps to (apparel / artwork / terroir / kits / retail)
   POST { lines:[{ variant, qty }] }  → { checkoutUrl }   (a fresh Shopify cart; the browser goes straight to checkout)
   503 { error:"not-configured" } until the env vars are set — the site then keeps its placeholder products.
   ========================================================= */
const VERSION = "2026-04";
const H = { "Content-Type": "application/json; charset=utf-8" };
const out = (status, body, cache = "no-store") => new Response(JSON.stringify(body), { status, headers: { ...H, "Cache-Control": cache } });

// Shopify collection → site category (matched on the collection's handle or title)
const CATS = [
  ["apparel", /apparel|clothing|merch/],
  ["artwork", /art|print|poster/],
  ["terroir", /terroir/],
  ["kits",    /kit/],
  ["retail",  /retail|bottle|spirit|product/]
];
const catOf = cols => {
  for (const c of cols) { const s = (c.handle + " " + c.title).toLowerCase(); for (const [id, re] of CATS) if (re.test(s)) return id; }
  return null;
};

async function gql(query, variables) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN || "", token = process.env.SHOPIFY_STOREFRONT_TOKEN || "";
  if (!domain || !token) return { notConfigured: true };
  const r = await fetch(`https://${domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}/api/${VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query, variables })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) return { error: (j.errors && j.errors[0] && j.errors[0].message) || "shopify-" + r.status };
  return { data: j.data };
}

const PRODUCTS = (withStock) => `query Products($cursor: String) {
  products(first: 100, after: $cursor, sortKey: TITLE) {
    pageInfo { hasNextPage endCursor }
    nodes {
      handle title description availableForSale
      ${withStock ? "totalInventory" : ""}
      collections(first: 5) { nodes { handle title } }
      priceRange { minVariantPrice { amount } }
      images(first: 8) { nodes { url(transform: { maxWidth: 1600 }) altText } }
      options { name values }
      variants(first: 50) { nodes { id availableForSale ${withStock ? "quantityAvailable" : ""} selectedOptions { name value } price { amount } } }
    }
  }
}`;

function shape(p) {
  const sizeOpt = (p.options || []).find(o => /size/i.test(o.name));
  const variants = p.variants.nodes.map(v => {
    const so = v.selectedOptions.find(o => /size/i.test(o.name));
    return { id: v.id, size: so ? so.value : null, available: v.availableForSale,
             stock: typeof v.quantityAvailable === "number" ? v.quantityAvailable : undefined, price: Number(v.price.amount) };
  });
  const sizes = sizeOpt ? sizeOpt.values : [];
  const total = typeof p.totalInventory === "number" ? p.totalInventory : undefined;
  return {
    handle: p.handle, title: p.title, desc: p.description || "",
    cat: catOf(p.collections.nodes),
    price: Number(p.priceRange.minVariantPrice.amount),
    images: p.images.nodes.map(i => i.url), photos: Math.max(1, p.images.nodes.length),
    sizes, soldOutSizes: sizes.filter(s => !variants.some(v => v.size === s && v.available)),
    available: p.availableForSale, stock: !sizes.length && total > 0 ? total : undefined,
    variants
  };
}

export default async (req) => {
  if (req.method === "GET") {
    const all = [];
    let cursor = null, withStock = true;
    for (let page = 0; page < 5; page++) {
      let r = await gql(PRODUCTS(withStock), { cursor });
      if (r.error && withStock && /quantityAvailable|totalInventory|access/i.test(r.error)) {   // token without the inventory scope
        withStock = false; r = await gql(PRODUCTS(false), { cursor });
      }
      if (r.notConfigured) return out(503, { error: "not-configured" });
      if (r.error) return out(502, { error: r.error });
      all.push(...r.data.products.nodes);
      if (!r.data.products.pageInfo.hasNextPage) break;
      cursor = r.data.products.pageInfo.endCursor;
    }
    return out(200, { products: all.map(shape), stock: withStock }, "public, max-age=60");
  }
  if (req.method !== "POST") return out(405, { error: "method" });

  let b; try { b = await req.json(); } catch (e) { return out(400, { error: "json" }); }
  const lines = (Array.isArray(b.lines) ? b.lines : [])
    .filter(l => typeof l.variant === "string" && /^gid:\/\/shopify\/ProductVariant\/\d+$/.test(l.variant))
    .slice(0, 50).map(l => ({ merchandiseId: l.variant, quantity: Math.max(1, Math.min(20, l.qty | 0)) }));
  if (!lines.length) return out(400, { error: "empty" });
  const r = await gql(`mutation Cart($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) { cart { checkoutUrl } userErrors { field message } }
  }`, { lines });
  if (r.notConfigured) return out(503, { error: "not-configured" });
  if (r.error) return out(502, { error: r.error });
  const c = r.data.cartCreate;
  if (c.userErrors && c.userErrors.length) return out(409, { error: c.userErrors[0].message });
  return out(200, { checkoutUrl: c.cart.checkoutUrl });
};
