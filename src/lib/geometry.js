// Converts a point on the page as the user sees it (u across, v down, both 0 to 1)
// into PDF coordinates, taking the page rotation into account.
export const pageRot = (page) => ((page.getRotation().angle % 360) + 360) % 360;

export function viewToPdf(u, v, rot, box) {
  const { x, y, width: W, height: H } = box;
  switch (rot) {
    case 90: return { x: x + v * W, y: y + u * H };
    case 180: return { x: x + (1 - u) * W, y: y + v * H };
    case 270: return { x: x + (1 - v) * W, y: y + (1 - u) * H };
    default: return { x: x + u * W, y: y + (1 - v) * H };
  }
}

// Size of the page as the user sees it, in PDF points.
export function viewSize(rot, box) {
  const sideways = rot % 180 !== 0;
  return { w: sideways ? box.height : box.width, h: sideways ? box.width : box.height };
}