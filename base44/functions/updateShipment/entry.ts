// Seller updates the shipment status for an order. Creates a ShipmentUpdate
// record (visible to the buyer as a tracking timeline) and updates the Order
// status. Verifies the seller has items in the order before allowing updates.
//
// Input: { order_id, status, location?, note?, tracking_number?, shipping_company? }
// Output: { success: true }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orderId = body?.order_id;
    const status = body?.status;
    const validStatuses = ['preparing', 'shipped', 'in_transit', 'delivered'];
    if (!orderId || !status)
      return Response.json({ error: 'order_id and status are required' }, { status: 400 });
    if (!validStatuses.includes(status))
      return Response.json({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') }, { status: 400 });

    // Verify this seller has items in this order
    const orderItems = await base44.asServiceRole.entities.OrderItem.filter({
      order_id: orderId,
      seller_id: user.id,
    });
    if (orderItems.length === 0)
      return Response.json({ error: 'You do not have any items in this order' }, { status: 403 });

    // Create shipment update record
    await base44.asServiceRole.entities.ShipmentUpdate.create({
      order_id: orderId,
      seller_id: user.id,
      seller_name: user.full_name || user.email || '',
      status,
      location: body?.location || '',
      note: body?.note || '',
      tracking_number: body?.tracking_number || '',
      shipping_company: body?.shipping_company || '',
    });

    // Update order status + tracking number
    const update = { status };
    if (body?.tracking_number) update.tracking_number = body.tracking_number;
    await base44.asServiceRole.entities.Order.update(orderId, update);

    // Email the buyer and seller when the order hits a shipping milestone.
    if (status === 'shipped' || status === 'delivered') {
      try {
        const order = await base44.asServiceRole.entities.Order.get(orderId);
        const sellerEmail = user.email;
        const buyerEmail = order?.buyer_email;
        const statusLabel = status === 'shipped' ? 'shipped' : 'delivered';
        const trackingLine = body?.tracking_number ? `\n\nTracking number: ${body.tracking_number}` : '';
        const carrierLine = body?.shipping_company ? `\nCarrier: ${body.shipping_company}` : '';

        if (buyerEmail) {
          await base44.integrations.Core.SendEmail({
            to: buyerEmail,
            subject: `Your PokeVault order has been ${statusLabel}`,
            body: `Great news! Your order has been ${statusLabel}.${trackingLine}${carrierLine}\n\nView full order details in your PokeVault Orders page.`,
          });
        }
        if (sellerEmail) {
          await base44.integrations.Core.SendEmail({
            to: sellerEmail,
            subject: `Order ${statusLabel}: shipment update posted`,
            body: `You marked order ${orderId} as ${statusLabel}.${trackingLine}${carrierLine}`,
          });
        }
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('updateShipment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}