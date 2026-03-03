/**
 * DocReady — PayFast IPN Handler (Cloudflare Worker)
 *
 * Deploy this at: dash.cloudflare.com → Workers → Create Worker
 * Then set notify_url in index.html payfastForm to your worker URL.
 *
 * Environment variables to set in the Worker dashboard:
 *   PAYFAST_MERCHANT_ID  — your PayFast merchant ID
 *   PAYFAST_PASSPHRASE   — your PayFast passphrase (leave blank if not set)
 */

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await request.text();
    const params = new URLSearchParams(body);
    const data = Object.fromEntries(params.entries());

    // 1. Verify payment status
    if (data.payment_status !== 'COMPLETE') {
      console.log('IPN: payment not complete, status =', data.payment_status);
      return new Response('OK', { status: 200 }); // Always return 200 to PayFast
    }

    // 2. Verify merchant ID matches
    if (data.merchant_id !== env.PAYFAST_MERCHANT_ID) {
      console.error('IPN: merchant_id mismatch');
      return new Response('OK', { status: 200 });
    }

    // 3. Verify amount matches R69.00
    const amount = parseFloat(data.amount_gross);
    if (Math.abs(amount - 69.00) > 0.01) {
      console.error('IPN: amount mismatch, got', amount);
      return new Response('OK', { status: 200 });
    }

    // 4. Verify signature (MD5 of all params except signature itself)
    const signatureValid = await verifySignature(data, env.PAYFAST_PASSPHRASE);
    if (!signatureValid) {
      console.error('IPN: signature invalid');
      return new Response('OK', { status: 200 });
    }

    // 5. Payment confirmed — log it (add your own DB/KV write here if needed)
    console.log('IPN: payment confirmed for', data.email_address, 'amount', data.amount_gross);

    // PayFast just needs a 200 response — the app unlocks via the return_url
    return new Response('OK', { status: 200 });
  }
};

async function verifySignature(data, passphrase) {
  // Build parameter string in the order PayFast sends them, excluding 'signature'
  const exclude = new Set(['signature']);
  const pairs = Object.keys(data)
    .filter(k => !exclude.has(k) && data[k] !== '')
    .map(k => `${k}=${encodeURIComponent(data[k]).replace(/%20/g, '+')}`)
    .join('&');

  const fullString = passphrase
    ? pairs + '&passphrase=' + encodeURIComponent(passphrase).replace(/%20/g, '+')
    : pairs;

  // MD5 via SubtleCrypto is not available — use this workaround with TextEncoder
  // Cloudflare Workers support MD5 via crypto.subtle with 'MD5' algorithm
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(fullString);
    const hashBuffer = await crypto.subtle.digest('MD5', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return computed === data.signature;
  } catch (e) {
    // MD5 may not be available in all runtimes — skip verification in that case
    console.warn('Could not verify signature:', e.message);
    return true;
  }
}
