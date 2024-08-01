let scene, camera, renderer, controls;
let particleGeometry, particleMaterial;
let fireworks = [];

init();
animate();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // controls = new OrbitControls(camera, renderer.domElement);

    particleGeometry = new THREE.BufferGeometry();
    particleMaterial = new THREE.PointsMaterial({ size: 0.5, transparent: true, vertexColors: true });

    window.addEventListener('click', onClick, false);
}

function onClick(event) {
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([scene], true);

    let x = (event.clientX / window.innerWidth) * 2 - 1;
    let y = -(event.clientY / window.innerHeight) * 2 + 1;
    let vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(camera);
    vector.sub(camera.position).normalize();
    let distance = -camera.position.z / vector.z;
    let pos = camera.position.clone().add(vector.multiplyScalar(distance));

    createFirework(pos.x, pos.y);
}

function createFirework(x, y) {
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = 0;

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5;
        velocities[i * 3] = Math.cos(angle) * speed;
        velocities[i * 3 + 1] = Math.sin(angle) * speed;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;

        lifetimes[i] = 1;
        alphas[i] = 1;

        // Assign random colors
        colors[i * 3] = Math.random();
        colors[i * 3 + 1] = Math.random();
        colors[i * 3 + 2] = Math.random();
    }

    const firework = {
        positions,
        velocities,
        lifetimes,
        alphas,
        colors,
        state: 'launch', // 'launch' or 'explode'
        time: 0
    };

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(geometry, particleMaterial);
    scene.add(points);
    firework.points = points;

    fireworks.push(firework);
}

function animate() {
    requestAnimationFrame(animate);
    updateFireworks();
    renderer.render(scene, camera);
    // controls.update();
}

function updateFireworks() {
    fireworks.forEach(firework => {
        const positions = firework.positions;
        const velocities = firework.velocities;
        const lifetimes = firework.lifetimes;
        const alphas = firework.alphas;

        if (firework.state === 'launch') {
            firework.time += 0.02;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] += 0.5; // launch upwards
                lifetimes[i] -= 0.02;
                alphas[i] = lifetimes[i]; // Update alpha based on lifetime
                if (lifetimes[i] <= 0) {
                    firework.state = 'explode';
                    firework.time = 0;
                    // Reset lifetimes for explosion phase
                    for (let j = 0; j < lifetimes.length; j++) {
                        lifetimes[j] = Math.random();
                        alphas[j] = 1;
                    }
                }
            }
        } else if (firework.state === 'explode') {
            firework.time += 0.02;

            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3] += velocities[i * 3] * 0.2;
                positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.2;
                positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.2;
                lifetimes[i] -= 0.02;
                alphas[i] = lifetimes[i]; // Update alpha based on lifetime
            }
        }

        firework.points.geometry.attributes.position.needsUpdate = true;
        firework.points.geometry.attributes.alpha.needsUpdate = true;
        firework.points.geometry.attributes.color.needsUpdate = true;

        // Update material opacity based on alpha attribute
        firework.points.material.opacity = Math.max(...alphas);
    });

    // Remove expired fireworks
    fireworks = fireworks.filter(firework => {
        const hasAliveParticles = firework.lifetimes.some(lifetime => lifetime > 0);
        if (!hasAliveParticles) {
            scene.remove(firework.points);
        }
        return hasAliveParticles;
    });
}
