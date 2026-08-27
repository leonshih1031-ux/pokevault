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
    if (!orderId || !status)
      return Response.json({ error: 'order_id and status are required' }, { status: 400 });

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

    return Response.json({ success: true });
  } catch (error) {
    console.error('updateShipment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}