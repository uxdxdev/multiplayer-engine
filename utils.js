import { Vector3 } from 'three';

const rotatePoint = (angle, cx, cz, px, pz) => {
  let x = px;
  let z = pz;
  x -= cx;
  z -= cz;
  let newX = x * Math.cos(angle) - z * Math.sin(angle);
  let newZ = x * Math.sin(angle) + z * Math.cos(angle);
  x = newX + cx;
  z = newZ + cz;
  return {
    x,
    z,
  };
};

// rotate bounding box points around the objects center at an angle
const getRotatedRectangle = (angle, objCenter, bbox) => {
  let bl = rotatePoint(angle, objCenter.x, objCenter.z, objCenter.x + bbox.bl.x, objCenter.z + bbox.bl.z);
  let br = rotatePoint(angle, objCenter.x, objCenter.z, objCenter.x + bbox.br.x, objCenter.z + bbox.br.z);
  let fr = rotatePoint(angle, objCenter.x, objCenter.z, objCenter.x + bbox.fr.x, objCenter.z + bbox.fr.z);
  let fl = rotatePoint(angle, objCenter.x, objCenter.z, objCenter.x + bbox.fl.x, objCenter.z + bbox.fl.z);
  return [bl, br, fr, fl];
};

const isUndefined = (value) => {
  return value === undefined;
};

//  Separating Axis Theorem
const doPolygonsIntersect = (a, b) => {
  var polygons = [a, b];
  var minA, maxA, projected, i, i1, j, minB, maxB;

  for (i = 0; i < polygons.length; i++) {
    // for each polygon, look at each edge of the polygon, and determine if it separates
    // the two shapes
    var polygon = polygons[i];
    for (i1 = 0; i1 < polygon.length; i1++) {
      // grab 2 vertices to create an edge
      var i2 = (i1 + 1) % polygon.length;
      var p1 = polygon[i1];
      var p2 = polygon[i2];

      // find the line perpendicular to this edge
      var normal = { x: p2.z - p1.z, z: p1.x - p2.x };

      minA = maxA = undefined;
      // for each vertex in the first shape, project it onto the line perpendicular to the edge
      // and keep track of the min and max of these values
      for (j = 0; j < a.length; j++) {
        projected = normal.x * a[j].x + normal.z * a[j].z;
        if (isUndefined(minA) || projected < minA) {
          minA = projected;
        }
        if (isUndefined(maxA) || projected > maxA) {
          maxA = projected;
        }
      }

      // for each vertex in the second shape, project it onto the line perpendicular to the edge
      // and keep track of the min and max of these values
      minB = maxB = undefined;
      for (j = 0; j < b.length; j++) {
        projected = normal.x * b[j].x + normal.z * b[j].z;
        if (isUndefined(minB) || projected < minB) {
          minB = projected;
        }
        if (isUndefined(maxB) || projected > maxB) {
          maxB = projected;
        }
      }

      // if there is no overlap between the projects, the edge we are looking at separates the two
      // polygons, and we know there is no overlap
      if (maxA < minB || maxB < minA) {
        return false;
      }
    }
  }
  return true;
};

export const runCollisionDetection = (playerData, world, playerBoundingBox) => {
  const playerBBoxRotated = getRotatedRectangle(playerData.rotation, playerData.position, playerBoundingBox);

  const worldObjects = world.collidableObjects;
  for (const worldObject of worldObjects) {
    const objectBBoxRotated = getRotatedRectangle(worldObject.rotation, { x: worldObject.x, z: worldObject.z }, worldObject.bbox);
    if (doPolygonsIntersect(playerBBoxRotated, objectBBoxRotated)) {
      // end the loop and signal a collision
      return true;
    }
  }

  return false;
};

const getUpdatedPosition = (position, { forward, backward, left, right }, playerSpeed, delta, world) => {
  const newPosition = { ...position };
  if (left) newPosition.x -= playerSpeed * delta;
  if (right) newPosition.x += playerSpeed * delta;
  if (forward) newPosition.z -= playerSpeed * delta;
  if (backward) newPosition.z += playerSpeed * delta;

  if (newPosition.x < -world.width) newPosition.x = world.width;
  if (newPosition.x > world.width) newPosition.x = -world.width;
  if (newPosition.z < -world.depth) newPosition.z = world.depth;
  if (newPosition.z > world.depth) newPosition.z = -world.depth;

  return newPosition;
};

export const getUpdatedPlayerPositionRotation = (currentPosition, currentRotation, controls, playerSpeed, delta, worldData, playerBoundingBox) => {
  let updatedPosition = null;
  let updatedRotation = null;

  // rotation
  const frontVector = new Vector3();
  const sideVector = new Vector3();
  const direction = new Vector3();
  const { forward, backward, left, right } = controls;
  frontVector.set(0, 0, Number(backward) - Number(forward));
  sideVector.set(Number(left) - Number(right), 0, 0);
  direction.subVectors(frontVector, sideVector);
  const newRotation = Math.atan2(direction.z, direction.x);

  // collision detection
  updatedPosition = currentPosition;
  updatedRotation = currentRotation;

  const newPosition = getUpdatedPosition(currentPosition, { forward, backward, left, right }, playerSpeed, delta, worldData);
  const isPlayerColliding = runCollisionDetection({ position: newPosition, rotation: newRotation }, worldData, playerBoundingBox);
  if (!isPlayerColliding) {
    updatedPosition = newPosition;
    updatedRotation = newRotation;
  }
  return { position: updatedPosition, rotation: updatedRotation };
};

export const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
