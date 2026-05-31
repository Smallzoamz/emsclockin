const polygonClipping = require('polygon-clipping');

const parseClosedPoly = (pointsStr) => {
  const pts = pointsStr.split(" ").filter(Boolean).map(p => {
    const [x, y] = p.split(",").map(Number);
    return [x, y];
  });
  if (pts.length > 2) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      pts.push([first[0], first[1]]);
    }
  }
  return pts;
};

const serializeOpenPoly = (pts) => {
  if (!pts || pts.length === 0) return "";
  const openPts = [...pts];
  if (openPts.length > 1) {
    const first = openPts[0];
    const last = openPts[openPts.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      openPts.pop();
    }
  }
  const rounded = openPts.map(p => [
    Math.round(p[0] * 10) / 10,
    Math.round(p[1] * 10) / 10
  ]);
  return rounded.map(p => `${p[0]},${p[1]}`).join(" ");
};

// Current zone is a square of size 10x10 at (0,0)
const currentPointsStr = "0,0 10,0 10,10 0,10";
// Other zone 1 is a square of size 10x10 at (5,0) - overlaps right half
const otherPointsStr1 = "5,0 15,0 15,10 5,10";
// Other zone 2 is a square of size 10x5 at (0,5) - overlaps bottom half
const otherPointsStr2 = "0,5 10,5 10,10 0,10";

let currentPoly = [parseClosedPoly(currentPointsStr)]; // Polygon (array of rings)

// Iteration 1
try {
  console.log("--- Iteration 1 ---");
  const otherPoly1 = [parseClosedPoly(otherPointsStr1)];
  const diffResult = polygonClipping.difference(currentPoly, otherPoly1);
  console.log("diffResult 1:", JSON.stringify(diffResult));
  if (diffResult && diffResult.length > 0 && diffResult[0].length > 0) {
    currentPoly = diffResult[0];
    console.log("currentPoly after 1:", JSON.stringify(currentPoly));
  }
} catch (err) {
  console.error("Error in subtraction 1:", err);
}

// Iteration 2
try {
  console.log("--- Iteration 2 ---");
  const otherPoly2 = [parseClosedPoly(otherPointsStr2)];
  const diffResult = polygonClipping.difference(currentPoly, otherPoly2);
  console.log("diffResult 2:", JSON.stringify(diffResult));
  if (diffResult && diffResult.length > 0 && diffResult[0].length > 0) {
    currentPoly = diffResult[0];
    console.log("currentPoly after 2:", JSON.stringify(currentPoly));
    const serialized = serializeOpenPoly(currentPoly[0]);
    console.log("Serialized result after 2:", serialized);
  }
} catch (err) {
  console.error("Error in subtraction 2:", err);
}
