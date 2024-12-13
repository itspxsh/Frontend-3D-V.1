import * as THREE from 'https://unpkg.com/three@0.129.0/build/three.module.js';
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("container3D").appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(40, 40, 40);
camera.lookAt(0, 0, 0);

const BASE_BOX_DIM = 30;

const ambientLight = new THREE.AmbientLight(0x404040, 2); 
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1); 
directionalLight.position.set(50, 50, 50);
scene.add(directionalLight);

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// start switch status
window.addEventListener('load', function () {
    // เลือก switch โดยใช้ id หรือ class ของมัน
    const switchElement = document.querySelector('.switch input');

    // ตั้งค่าให้ switch อยู่ในสถานะปิดตอนเปิดเว็บ
    switchElement.checked = false;

    // ตรวจสอบสถานะของ switch และตั้งค่า sidebar ให้ปิด
    const sidebar = document.getElementById("sidebar");
    sidebar.style.display = "none";  // เริ่มต้นให้ sidebar ซ่อนอยู่
});

document.querySelector(".switch input").addEventListener("change", function(e) {
    const sidebar = document.getElementById("sidebar");

    if (e.target.checked) {
        sidebar.style.display = "block";  // เปิด sidebar
        setTimeout(() => sidebar.classList.add('show'), 10);  // เพิ่มคลาส 'show' เพื่อให้มี transition
    } else {
        sidebar.classList.remove('show');
        setTimeout(() => sidebar.style.display = "none", 300);  // ซ่อนหลังจาก transition
    }
});
// end switch status


// start add box
let boxCount = 1;

document.getElementById("addBoxBtn").addEventListener("click", () => {
    if (boxCount < 20) {
        const tableBody = document.querySelector("#boxTable tbody");

        const newRow = document.createElement("tr");
        newRow.classList.add("boxInput");

        newRow.innerHTML = `
            <td class="order">${boxCount + 1}</td>
            <td><input type="number" id="length${boxCount}" required /></td>
            <td><input type="number" id="width${boxCount}" required /></td>
            <td><input type="number" id="height${boxCount}" required /></td>
            <td><input type="number" id="quantity${boxCount}" required /></td>
            <td><button type="button" class="deleteBtn">Delete</button></td>
        `;

        tableBody.appendChild(newRow);
        boxCount++;

        attachDeleteListeners(); // Re-attach delete listeners
    } else {
        alert("You can only add up to 20 boxes.");
    }
});
// end add box

// start delete botton
function attachDeleteListeners() {
    const deleteButtons = document.querySelectorAll(".deleteBtn");

    deleteButtons.forEach((btn) => {
        btn.removeEventListener("click", deleteRow); // Avoid duplicate listeners
        btn.addEventListener("click", deleteRow);
    });
}

function deleteRow(event) {
    const row = event.target.closest("tr");
    row.remove();
    updateOrder();
}

function updateOrder() {
    const orders = document.querySelectorAll(".order");
    orders.forEach((orderCell, index) => {
        orderCell.textContent = index + 1;
    });
    boxCount = orders.length; // Update the global boxCount
}

attachDeleteListeners(); // Attach initial delete listeners
// end delete botton


// start calculate function
async function calculatePacking() {
    const boxes = [];
    const boxInputs = document.querySelectorAll("#boxTable tbody tr"); // ดึงข้อมูลจาก #boxForm และ #boxTable
    
    for (let i = 0; i < boxInputs.length; i++) {
        const length = document.getElementById(`length${i}`);
        const width = document.getElementById(`width${i}`);
        const height = document.getElementById(`height${i}`);

        if (length && width && height/* && quantity */) {
            boxes.push({
                length: parseFloat(length.value),
                width: parseFloat(width.value),
                height: parseFloat(height.value),
                // quantity: parseInt(quantity.value)
            });
        }
    }

    if (boxes.length === 0) {
        alert("Please enter at least one box.");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/calculate_packing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boxes }),
        });

        if (!response.ok) {
            throw new Error("Failed to calculate packing");
        }

        const packedBoxes = await response.json();
        console.log("Packed boxes data:", packedBoxes);
        visualizePacking(packedBoxes);
        updateBoxStatus(packedBoxes.placement_status);
    } catch (error) {
        console.error("Error:", error);
        alert("There was an error while calculating the packing. Please try again. ");
    }
}
// end calculate function

// start visualize
function visualizePacking(responseData) {
    const packedBoxes = responseData.packed_boxes;
    console.log("Visualizing Packing Data:", packedBoxes);

    scene.children = scene.children.filter((child) => child.type === "AmbientLight" || child.type === "DirectionalLight" || child.type === "PerspectiveCamera");

    const baseBox = new THREE.BoxGeometry(BASE_BOX_DIM, BASE_BOX_DIM, BASE_BOX_DIM);
    const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x078EC3, wireframe: true });
    const baseMesh = new THREE.Mesh(baseBox, baseMaterial);
    scene.add(baseMesh);

    console.log("Base box added to scene.");

    packedBoxes.forEach((box, i) => {
        console.log(`Adding box ${i}:`, box);

        const geometry = new THREE.BoxGeometry(box.length, box.width, box.height);

        let color = new THREE.Color(box.color);
        color = color.multiplyScalar(0.9);  

        const material = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(
            box.x - BASE_BOX_DIM / 2 + box.length / 2,
            box.y - BASE_BOX_DIM / 2 + box.width / 2,
            box.z - BASE_BOX_DIM / 2 + box.height / 2
        );
        scene.add(mesh);
    });

    console.log("Packed boxes added to scene.");
}
// end visualize


// start side bar
function updateBoxStatus(placementStatus) {
    const statusList = document.getElementById("box-status-list");
    statusList.innerHTML = ""; 

    placementStatus.forEach((statusObj) => {
        const listItem = document.createElement("li");

        listItem.style.display = "flex";
        listItem.style.alignItems = "center"; 
        listItem.style.marginBottom = "10px"; 

        const colorHex = `#${statusObj.color.toString(16).padStart(6, '0')}`;

        const colorIndicator = document.createElement("div");
        colorIndicator.style.width = "15px";
        colorIndicator.style.height = "15px";
        colorIndicator.style.borderRadius = "50%";
        colorIndicator.style.backgroundColor = colorHex;
        colorIndicator.style.marginRight = "10px"; 

        listItem.appendChild(colorIndicator);
        listItem.appendChild(document.createTextNode(`${statusObj.box}: ${statusObj.status}`));

        statusList.appendChild(listItem);
    });
}

document.getElementById("calculateBtn").addEventListener("click", function () {
    calculatePacking();  // ฟังก์ชันการคำนวณที่มีอยู่

    const switchElement = document.querySelector(".switch input");  // เข้าถึง input switch
    const sidebar = document.getElementById("sidebar");

    // เปลี่ยนสถานะของ switch ให้เป็น checked (เปิด)
    switchElement.checked = true;

    // แสดง sidebar ถ้า switch ถูกเลือก
    sidebar.style.display = switchElement.checked ? "block" : "none";
});
// end side bar


function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();