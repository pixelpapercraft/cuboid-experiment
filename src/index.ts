import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { CharacterKey, characters } from "./characters";

const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;
const VIEW_ANGLE = 45;
const ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT;
const NEAR = 1;
const FAR = 10000;

const origin = new THREE.Vector3(0, 0, 0);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
camera.position.set(3, 3, 12);
camera.lookAt(origin);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

const orbitControls = new OrbitControls(camera, renderer.domElement);

document.body.appendChild(renderer.domElement);

function makeButton(label: string, onClick: () => void) {
  const button = document.createElement("button");
  const buttonLabel = document.createTextNode(label);
  button.appendChild(buttonLabel);
  button.onclick = onClick;
  return button;
}

const axesHelper = new THREE.AxesHelper(1 / 4);
scene.add(axesHelper);

function roundVector(vector: THREE.Vector3) {
  const x = Math.round(vector.x * 1000) / 1000 || 0;
  const y = Math.round(vector.y * 1000) / 1000 || 0;
  const z = Math.round(vector.z * 1000) / 1000 || 0;
  return new THREE.Vector3(x, y, z);
}

class Pixel extends THREE.Object3D {
  constructor(color: string, size: number) {
    super();
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.add(mesh);
  }
}

export class Character extends THREE.Object3D {
  constructor(character: CharacterKey, color: string, size: number) {
    super();
    const bitmap = characters[character];
    const colCount = bitmap.length;
    const rowCount = bitmap.reduce(
      (acc, bits) => Math.max(acc, bits.length),
      0
    );
    const pixels = [];
    for (let row = 0; row < bitmap.length; row++) {
      let cols = bitmap[row];
      for (let col = 0; col < cols.length; col++) {
        let bit = bitmap[row][col];
        if (bit) {
          const pixel = new Pixel(color, size);
          const x = size * col;
          const y = size * row * -1;
          pixel.position.set(x, y, 0);
          pixels.push(pixel);
        }
      }
    }
    pixels.forEach((pixel) => {
      this.add(pixel);
    });

    const width = colCount * size;
    const height = rowCount * size;
    this.position.set(-width / 2, height / 2, 0);
  }
}

class Arrow extends THREE.ArrowHelper {
  constructor({
    x,
    y,
    z,
    size,
  }: {
    x: number;
    y: number;
    z: number;
    size: number;
  }) {
    super(
      new THREE.Vector3(x, y, z).normalize(),
      new THREE.Vector3(0, 0, 0),
      size
    );
  }
}

class Face extends THREE.Object3D {
  mesh: THREE.Mesh;
  width: number;
  height: number;

  constructor({
    name,
    width,
    height,
    character: characterKey,
    color,
  }: {
    name: string;
    character: CharacterKey;
    color: string;
    width: number;
    height: number;
  }) {
    super();

    this.name = name;
    this.width = width;
    this.height = height;

    const planeGeom = new THREE.PlaneGeometry(width, height);
    const planeMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
    const planeMesh = new THREE.Mesh(planeGeom, planeMaterial);

    const arrowX = new Arrow({
      x: 1,
      y: 0,
      z: 0,
      size: 1,
    });

    const arrowY = new Arrow({
      x: 0,
      y: 1,
      z: 0,
      size: 1,
    });

    const arrowZ = new Arrow({
      x: 0,
      y: 0,
      z: 1,
      size: 1,
    });

    const characterSize = 1 / 16;

    const character = new Character(characterKey, color, characterSize);

    this.add(planeMesh);
    this.add(character);

    this.add(arrowX);
    this.add(arrowY);
    this.add(arrowZ);

    this.mesh = planeMesh;
  }

  getNormal() {
    const v = new THREE.Vector3();
    this.getWorldDirection(v);
    return roundVector(v.normalize());
  }

  getVertices() {
    // Temporary vector to hold calculated values.
    const v = new THREE.Vector3();

    // This is needed to ensure the "face.matrixWorld" matrix has been populated.
    this.getWorldPosition(v);

    const positionAttribute = this.mesh.geometry.getAttribute("position");
    const vertices = [0, 1, 2, 3].map((index) => {
      v.fromBufferAttribute(positionAttribute, index);
      this.localToWorld(v);
      return roundVector(v.clone());
    });

    return vertices;
  }
}

class Cuboid extends THREE.Object3D {
  front: Face;
  back: Face;
  right: Face;
  left: Face;
  top: Face;
  bottom: Face;

  faces: Face[];

  constructor(width: number, height: number, depth: number) {
    super();

    const front = new Face({
      name: "Front",
      width,
      height,
      character: "F",
      color: "red",
    });
    front.position.set(0, 0, depth / 2);

    const back = new Face({
      name: "Back",
      width,
      height,
      character: "K",
      color: "orange",
    });
    back.applyMatrix4(
      new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(0, Math.PI, 0, "XYZ")
      )
    );
    back.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -depth / 2));

    const right = new Face({
      name: "Right",
      width: depth,
      height,
      character: "R",
      color: "yellow",
    });
    right.applyMatrix4(
      new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(0, -Math.PI / 2, 0, "XYZ")
      )
    );
    right.applyMatrix4(new THREE.Matrix4().makeTranslation(-width / 2, 0, 0));

    const left = new Face({
      name: "Left",
      width: depth,
      height,
      character: "L",
      color: "green",
    });
    left.applyMatrix4(
      new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(0, Math.PI / 2, 0, "XYZ")
      )
    );
    left.applyMatrix4(new THREE.Matrix4().makeTranslation(width / 2, 0, 0));

    const top = new Face({
      name: "Top",
      width,
      height: depth,
      character: "T",
      color: "blue",
    });
    top.applyMatrix4(
      new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(-Math.PI / 2, 0, 0, "XYZ")
      )
    );
    top.applyMatrix4(new THREE.Matrix4().makeTranslation(0, height / 2, 0));

    const bottom = new Face({
      name: "Bottom",
      width,
      height: depth,
      character: "B",
      color: "violet",
    });
    bottom.applyMatrix4(
      new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(Math.PI / 2, 0, 0, "XYZ")
      )
    );
    bottom.applyMatrix4(new THREE.Matrix4().makeTranslation(0, -height / 2, 0));

    this.front = front;
    this.back = back;
    this.right = right;
    this.left = left;
    this.top = top;
    this.bottom = bottom;

    this.faces = [front, back, right, left, top, bottom];
  }

  addToScene(scene: THREE.Scene) {
    scene.add(cuboid);
    scene.add(cuboid.front);
    scene.add(cuboid.back);
    scene.add(cuboid.right);
    scene.add(cuboid.left);
    scene.add(cuboid.top);
    scene.add(cuboid.bottom);
  }

  getVertices() {
    const front = this.front.getVertices();
    const back = this.back.getVertices();
    const right = this.right.getVertices();
    const left = this.left.getVertices();
    const top = this.top.getVertices();
    const bottom = this.bottom.getVertices();
    return { front, back, right, left, top, bottom };
  }

  rotateX90() {
    const angle = Math.PI / 2;
    const euler = new THREE.Euler(angle, 0, 0, "XYZ");
    const matrix = new THREE.Matrix4().makeRotationFromEuler(euler);
    this.front.applyMatrix4(matrix);
    this.back.applyMatrix4(matrix);
    this.left.applyMatrix4(matrix);
    this.right.applyMatrix4(matrix);
    this.top.applyMatrix4(matrix);
    this.bottom.applyMatrix4(matrix);
  }

  rotateY90() {
    const angle = Math.PI / 2;
    const euler = new THREE.Euler(0, angle, 0, "XYZ");
    const matrix = new THREE.Matrix4().makeRotationFromEuler(euler);
    this.front.applyMatrix4(matrix);
    this.back.applyMatrix4(matrix);
    this.left.applyMatrix4(matrix);
    this.right.applyMatrix4(matrix);
    this.top.applyMatrix4(matrix);
    this.bottom.applyMatrix4(matrix);
  }

  rotateZ90() {
    const angle = Math.PI / 2;
    const euler = new THREE.Euler(0, 0, angle, "XYZ");
    const matrix = new THREE.Matrix4().makeRotationFromEuler(euler);
    this.front.applyMatrix4(matrix);
    this.back.applyMatrix4(matrix);
    this.left.applyMatrix4(matrix);
    this.right.applyMatrix4(matrix);
    this.top.applyMatrix4(matrix);
    this.bottom.applyMatrix4(matrix);
  }

  unwrap(direction: "North" | "South" | "East" | "West") {
    const frontNormal = new THREE.Vector3(0, 0, 1);
    const front = this.faces.find((face) => {
      return face.getNormal().equals(frontNormal);
    });

    const backNormal = new THREE.Vector3(0, 0, -1);
    const back = this.faces.find((face) => {
      return face.getNormal().equals(backNormal);
    });

    const rightNormal = new THREE.Vector3(-1, 0, 0);
    const right = this.faces.find((face) => {
      return face.getNormal().equals(rightNormal);
    });

    const leftNormal = new THREE.Vector3(1, 0, 0);
    const left = this.faces.find((face) => {
      return face.getNormal().equals(leftNormal);
    });

    const topNormal = new THREE.Vector3(0, 1, 0);
    const top = this.faces.find((face) => {
      return face.getNormal().equals(topNormal);
    });

    const bottomNormal = new THREE.Vector3(0, -1, 0);
    const bottom = this.faces.find((face) => {
      return face.getNormal().equals(bottomNormal);
    });

    if (front && back && right && left && top && bottom) {
      const topVertices = top.getVertices();
      const topCorners = {
        topLeft: topVertices.find((v) => v.x < 0 && v.z < 0),
        topRight: topVertices.find((v) => v.x > 0 && v.z < 0),
        bottomLeft: topVertices.find((v) => v.x < 0 && v.z > 0),
        bottomRight: topVertices.find((v) => v.x > 0 && v.z > 0),
      };

      const frontVertices = front.getVertices();
      const frontCorners = {
        topLeft: frontVertices.find((v) => v.x < 0 && v.y > 0),
        topRight: frontVertices.find((v) => v.x > 0 && v.y > 0),
        bottomLeft: frontVertices.find((v) => v.x < 0 && v.y < 0),
        bottomRight: frontVertices.find((v) => v.x > 0 && v.y < 0),
      };

      if (
        frontCorners.topLeft &&
        frontCorners.bottomRight &&
        topCorners.topLeft
      ) {
        const width = frontCorners.bottomRight.x - frontCorners.topLeft.x;
        const height = frontCorners.topLeft.y - frontCorners.bottomRight.y;
        const depth = frontCorners.topLeft.z - topCorners.topLeft.z;

        front.applyMatrix4(
          new THREE.Matrix4().makeTranslation(0, 0, -depth / 2)
        );

        if (direction === "West") {
          back.applyMatrix4(
            new THREE.Matrix4().makeTranslation(0, 0, depth / 2)
          );
          back.applyMatrix4(
            new THREE.Matrix4().makeRotationFromEuler(
              new THREE.Euler(0, Math.PI, 0, "XYZ")
            )
          );
          back.applyMatrix4(
            new THREE.Matrix4().makeTranslation(-width - depth, 0, 0)
          );
        } else if (direction === "North") {
          back.applyMatrix4(
            new THREE.Matrix4().makeTranslation(0, 0, depth / 2)
          );
          back.applyMatrix4(
            new THREE.Matrix4().makeRotationFromEuler(
              new THREE.Euler(Math.PI, 0, 0, "XYZ")
            )
          );
          back.applyMatrix4(
            new THREE.Matrix4().makeTranslation(0, height + depth, 0)
          );
        } else if (direction === "South") {
          back.applyMatrix4(
            new THREE.Matrix4().makeTranslation(0, 0, depth / 2)
          );
          back.applyMatrix4(
            new THREE.Matrix4().makeRotationFromEuler(
              new THREE.Euler(Math.PI, 0, 0, "XYZ")
            )
          );
          back.applyMatrix4(
            new THREE.Matrix4().makeTranslation(0, -(height + depth), 0)
          );
        } else {
          back.applyMatrix4(
            new THREE.Matrix4().makeTranslation(0, 0, depth / 2)
          );
          back.applyMatrix4(
            new THREE.Matrix4().makeRotationFromEuler(
              new THREE.Euler(0, Math.PI, 0, "XYZ")
            )
          );
          back.applyMatrix4(
            new THREE.Matrix4().makeTranslation(width + depth, 0, 0)
          );
        }

        top.applyMatrix4(
          new THREE.Matrix4().makeTranslation(0, -height / 2, -depth / 2)
        );
        top.applyMatrix4(
          new THREE.Matrix4().makeRotationFromEuler(
            new THREE.Euler(Math.PI / 2, 0, 0, "XYZ")
          )
        );
        top.applyMatrix4(new THREE.Matrix4().makeTranslation(0, height / 2, 0));

        bottom.applyMatrix4(
          new THREE.Matrix4().makeTranslation(0, height / 2, -depth / 2)
        );
        bottom.applyMatrix4(
          new THREE.Matrix4().makeRotationFromEuler(
            new THREE.Euler(-Math.PI / 2, 0, 0, "XYZ")
          )
        );
        bottom.applyMatrix4(
          new THREE.Matrix4().makeTranslation(0, -height / 2, 0)
        );

        right.applyMatrix4(
          new THREE.Matrix4().makeTranslation(width / 2, 0, -depth / 2)
        );
        right.applyMatrix4(
          new THREE.Matrix4().makeRotationFromEuler(
            new THREE.Euler(0, Math.PI / 2, 0, "XYZ")
          )
        );
        right.applyMatrix4(
          new THREE.Matrix4().makeTranslation(-width / 2, 0, 0)
        );

        left.applyMatrix4(
          new THREE.Matrix4().makeTranslation(-width / 2, 0, -depth / 2)
        );
        left.applyMatrix4(
          new THREE.Matrix4().makeRotationFromEuler(
            new THREE.Euler(0, -Math.PI / 2, 0, "XYZ")
          )
        );
        left.applyMatrix4(new THREE.Matrix4().makeTranslation(width / 2, 0, 0));
      }
    }
  }
}

const cuboid = new Cuboid(1, 2, 3);
cuboid.addToScene(scene);

function update() {
  orbitControls.update();
}

function render() {
  renderer.render(scene, camera);
}

function tick() {
  update();
  render();
  requestAnimationFrame(tick);
}

tick();

const rotateXButton = makeButton("Rotate X", () => {
  cuboid.rotateX90();
});

const rotateYButton = makeButton("Rotate Y", () => {
  cuboid.rotateY90();
});

const rotateZButton = makeButton("Rotate Z", () => {
  cuboid.rotateZ90();
});

const unwrapButton = makeButton("Unwrap", () => {
  cuboid.unwrap("West");
});

function px(n: number) {
  return `${n}px`;
}

let top = 20;
let right = 20;
let buttonHeight = 40;

rotateXButton.style.position = "absolute";
rotateXButton.style.right = px(right);
rotateXButton.style.top = px(top);

rotateYButton.style.position = "absolute";
rotateYButton.style.right = px(right);
rotateYButton.style.top = px(top + buttonHeight);

rotateZButton.style.position = "absolute";
rotateZButton.style.right = px(right);
rotateZButton.style.top = px(top + buttonHeight * 2);

unwrapButton.style.position = "absolute";
unwrapButton.style.right = px(right);
unwrapButton.style.top = px(top + buttonHeight * 3);

document.body.append(rotateXButton);
document.body.append(rotateYButton);
document.body.append(rotateZButton);
document.body.append(unwrapButton);
