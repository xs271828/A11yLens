export const demoPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Northstar Supply — Checkout</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; color: #1c2522; background: #f5f7f5; font-family: Inter, Arial, sans-serif; }
      header { height: 72px; padding: 0 7vw; display: flex; align-items: center; justify-content: space-between; background: #17382e; color: white; }
      .brand { font-weight: 800; font-size: 21px; }
      .cart { border: 0; background: transparent; color: white; font-size: 24px; }
      main { width: min(1100px, 88vw); margin: 58px auto; display: grid; grid-template-columns: 1.35fr .85fr; gap: 50px; }
      .eyebrow { color: #78827e; font-size: 13px; text-transform: uppercase; }
      h1 { margin: 8px 0 30px; font-size: 42px; }
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .field-wide { grid-column: 1 / -1; }
      label { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 700; }
      input, select { width: 100%; height: 47px; padding: 0 12px; border: 1px solid #cbd2ce; border-radius: 4px; background: white; }
      .hint { margin: 8px 0 0; color: #a9aeab; font-size: 12px; }
      .pay { width: 100%; height: 50px; margin-top: 24px; border: 0; border-radius: 4px; color: white; background: #d84b3e; font-weight: 800; }
      aside { align-self: start; padding: 28px; border: 1px solid #d9dfdc; background: white; }
      .product { display: grid; grid-template-columns: 90px 1fr; gap: 18px; padding-bottom: 24px; border-bottom: 1px solid #e3e7e4; }
      .product img { width: 90px; height: 110px; object-fit: cover; background: #dbe4de; }
      .product h3 { margin: 5px 0 8px; }
      .muted { color: #7f8985; font-size: 13px; }
      .line { display: flex; justify-content: space-between; margin-top: 20px; }
      .total { padding-top: 18px; border-top: 1px solid #e3e7e4; font-size: 18px; font-weight: 800; }
      @media (max-width: 760px) { main { grid-template-columns: 1fr; } .form-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">NORTHSTAR SUPPLY</div>
      <button class="cart">▣</button>
    </header>
    <main>
      <section>
        <div class="eyebrow">Secure checkout</div>
        <h1>Where should we send it?</h1>
        <form>
          <div class="form-grid">
            <div><label for="first-name">First name</label><input id="first-name" autocomplete="given-name" /></div>
            <div><label for="last-name">Last name</label><input id="last-name" autocomplete="family-name" /></div>
            <div class="field-wide"><input type="email" placeholder="Email address" /><p class="hint">We'll only use this for delivery updates.</p></div>
            <div class="field-wide"><label for="address">Street address</label><input id="address" autocomplete="street-address" /></div>
            <div><label for="city">City</label><input id="city" autocomplete="address-level2" /></div>
            <div><select><option>Choose a region</option><option>North</option><option>South</option></select></div>
          </div>
          <button class="pay" type="submit">Continue to payment</button>
        </form>
      </section>
      <aside>
        <div class="product">
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='220'%3E%3Crect width='180' height='220' fill='%23dbe4de'/%3E%3Cpath d='M55 57h70l15 125H40z' fill='%23527869'/%3E%3Cpath d='M70 58c0-28 40-28 40 0' fill='none' stroke='%2317382e' stroke-width='8'/%3E%3C/svg%3E" />
          <div><div class="muted">Field collection</div><h3>Canvas trail pack</h3><div>$128.00</div></div>
        </div>
        <div class="line"><span>Subtotal</span><span>$128.00</span></div>
        <div class="line"><span>Shipping</span><span>Free</span></div>
        <div class="line total"><span>Total</span><span>$128.00</span></div>
      </aside>
    </main>
  </body>
</html>`;
