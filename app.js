(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const statConfig = [
    { key: "attack", label: "Ataque", desc: "Daño de tus golpes", icon: "⚔", base: 20 },
    { key: "defense", label: "Defensa", desc: "Reduce daño recibido", icon: "⬡", base: 20 },
    { key: "agility", label: "Agilidad", desc: "Ventaja y evasión", icon: "➶", base: 15 },
    { key: "vitality", label: "Vitalidad", desc: "Puntos de vida", icon: "♥", base: 20 },
    { key: "luck", label: "Suerte", desc: "Posibilidad crítica", icon: "✧", base: 10 },
    { key: "energy", label: "Energía", desc: "Poder especial", icon: "ϟ", base: 15 }
  ];
  const classes = {
    Mago: { icon: "✧", passive: "Núcleo arcano", text: "Tu energía potencia las habilidades especiales.", bonus: "energy" },
    Ataque: { icon: "⚔", passive: "Instinto ofensivo", text: "Tus golpes básicos infligen daño adicional.", bonus: "attack" },
    Defensa: { icon: "⬡", passive: "Bastión", text: "Tu armadura reduce parte del daño recibido.", bonus: "defense" },
    Explorador: { icon: "➶", passive: "Paso ligero", text: "Tu agilidad aumenta la probabilidad de esquivar.", bonus: "agility" },
    Tecnología: { icon: "⌘", passive: "Sobrecarga táctica", text: "Tus habilidades especiales consumen menos energía.", bonus: "tech" }
  };
  const defaults = { attack: 20, defense: 20, agility: 15, vitality: 20, luck: 10, energy: 15 };
  let stats = { ...defaults };
  let selectedClass = "Mago";
  let playerHp = 100, maxPlayerHp = 100, enemyHp = 100, maxEnemyHp = 100;
  let energy = 30, maxEnergy = 30, defending = false, battleOver = false, turn = 0;
  const enemyNames = ["Centinela", "Dron de combate", "Gladiador de hierro", "Sombra errante"];
  const total = () => Object.values(stats).reduce((sum, value) => sum + value, 0);
  const remaining = () => 100 - total();

  function renderStats() {
    $("#statsList").innerHTML = statConfig.map((stat) => `
      <div class="stat-row">
        <div class="stat-info"><span class="stat-symbol">${stat.icon}</span><div><strong>${stat.label}</strong><small>${stat.desc}</small></div></div>
        <div class="stat-controls"><button type="button" data-stat="${stat.key}" data-delta="-1" aria-label="Quitar una moneda de ${stat.label}" ${stats[stat.key] <= 0 ? "disabled" : ""}>−</button><span class="stat-value">${stats[stat.key]}</span><button type="button" data-stat="${stat.key}" data-delta="1" aria-label="Añadir una moneda a ${stat.label}" ${remaining() <= 0 ? "disabled" : ""}>+</button></div>
      </div>`).join("");
    $("#remainingCoins").textContent = remaining();
    $("#coinProgress").style.width = total() + "%";
    $("#allocationMessage").textContent = remaining() === 0 ? "¡Distribución completa!" : `Te quedan ${remaining()} monedas por asignar.`;
    $("#startBattle").disabled = remaining() !== 0;
  }

  function updateClass() {
    const data = classes[selectedClass];
    $("#passiveTitle").textContent = data.passive;
    $("#passiveText").textContent = data.text;
    $$(".class-card").forEach((card) => {
      const selected = card.dataset.class === selectedClass;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
  }

  $("#classGrid").addEventListener("click", (event) => {
    const card = event.target.closest("[data-class]");
    if (!card) return;
    selectedClass = card.dataset.class;
    updateClass();
  });

  $("#statsList").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-stat]");
    if (!button) return;
    const key = button.dataset.stat;
    const delta = Number(button.dataset.delta);
    if (delta > 0 && remaining() <= 0) return;
    if (delta < 0 && stats[key] <= 0) return;
    stats[key] += delta;
    renderStats();
  });

  $("#resetStats").addEventListener("click", () => {
    stats = Object.fromEntries(statConfig.map(({ key }) => [key, 0]));
    stats.attack = 17; stats.defense = 17; stats.agility = 16;
    stats.vitality = 17; stats.luck = 16; stats.energy = 17;
    renderStats();
  });

  function log(message) {
    const line = document.createElement("p");
    line.textContent = message;
    $("#battleLog").prepend(line);
  }

  function updateBars() {
    $("#playerHpText").textContent = `${Math.max(0, playerHp)} / ${maxPlayerHp}`;
    $("#playerHpBar").style.width = Math.max(0, playerHp / maxPlayerHp * 100) + "%";
    $("#enemyHpText").textContent = `${Math.max(0, enemyHp)} / ${maxEnemyHp}`;
    $("#enemyHpBar").style.width = Math.max(0, enemyHp / maxEnemyHp * 100) + "%";
    $("#energyText").textContent = `${energy} / ${maxEnergy}`;
    $("#energyBar").style.width = Math.max(0, energy / maxEnergy * 100) + "%";
    $$(".action-button").forEach((button) => {
      button.disabled = battleOver || (button.dataset.action === "special" && energy < (selectedClass === "Tecnología" ? 7 : 10));
    });
  }

  function finishBattle(won) {
    battleOver = true;
    const banner = $("#resultBanner");
    banner.classList.remove("hidden");
    banner.classList.toggle("loss", !won);
    banner.textContent = won ? "◆ VICTORIA — LA ARENA RECONOCE TU FUERZA ◆" : "DERROTA — RECONFIGURA TU ESTRATEGIA Y VUELVE A LUCHAR";
    $("#enemyStatus").textContent = won ? "Unidad neutralizada." : "Tu combatiente ha caído.";
    updateBars();
  }

  function enemyTurn() {
    if (battleOver) return;
    turn++;
    const base = 7 + Math.floor(Math.random() * 8) + Math.floor(turn / 3);
    const defense = stats.defense * 0.22 + (selectedClass === "Defensa" ? 5 : 0);
    let damage = Math.max(3, Math.round(base - defense));
    if (defending) {
      damage = Math.max(1, Math.round(damage * 0.4));
      defending = false;
      log(`Tu guardia absorbe parte del impacto. Recibes ${damage} de daño.`);
    } else {
      const dodged = selectedClass === "Explorador" && Math.random() < Math.min(.35, .1 + stats.agility / 150);
      if (dodged) {
        damage = 0;
        log("¡Paso ligero! Esquivas el ataque enemigo.");
      } else log(`El oponente responde y te inflige ${damage} de daño.`);
    }
    playerHp = Math.max(0, playerHp - damage);
    energy = Math.min(maxEnergy, energy + 3);
    updateBars();
    if (playerHp <= 0) finishBattle(false);
  }

  function playerAction(action) {
    if (battleOver) return;
    const specialty = $("#specialty").value;
    const affinity = $("#affinity").value;
    if (action === "guard") {
      defending = true;
      energy = Math.min(maxEnergy, energy + 5);
      log("Adoptas una postura defensiva. El próximo golpe hará menos daño.");
      enemyTurn();
      return;
    }
    if (action === "special") {
      const cost = selectedClass === "Tecnología" ? 7 : 10;
      if (energy < cost) { log("No tienes suficiente energía para esa habilidad."); return; }
      energy -= cost;
      let multiplier = 1.65 + stats.energy / 100;
      if (selectedClass === "Mago") multiplier += .2;
      if (specialty === "Combate" || specialty === "Bombardero") multiplier += .15;
      if (specialty === "Curación") {
        const healed = Math.min(maxPlayerHp - playerHp, 12 + stats.energy * .5);
        playerHp += healed;
        log(`Canalizas ${affinity}: recuperas ${Math.round(healed)} puntos de vida y lanzas un pulso mágico.`);
      } else log(`¡Habilidad ${affinity}! Tu ${specialty.toLowerCase()} golpea con fuerza aumentada.`);
      let damage = Math.round((8 + stats.attack * .65 + stats.energy * .2) * multiplier);
      if (selectedClass === "Ataque") damage += 5;
      enemyHp = Math.max(0, enemyHp - damage);
      log(`La habilidad inflige ${damage} de daño.`);
    } else {
      let damage = Math.round(6 + stats.attack * .62 + Math.random() * 5);
      if (selectedClass === "Ataque") damage += 4;
      const criticalChance = Math.min(.45, .05 + stats.luck * .012);
      if (Math.random() < criticalChance) {
        damage = Math.round(damage * 1.65);
        log("¡GOLPE CRÍTICO! Encuentras una abertura en la defensa rival.");
      }
      enemyHp = Math.max(0, enemyHp - damage);
      log(`Tu ataque básico conecta e inflige ${damage} de daño.`);
    }
    if (enemyHp <= 0) {
      updateBars();
      finishBattle(true);
      return;
    }
    updateBars();
    enemyTurn();
  }

  $$(".action-button").forEach((button) => button.addEventListener("click", () => playerAction(button.dataset.action)));

  $("#startBattle").addEventListener("click", () => {
    if (remaining() !== 0) return;
    maxPlayerHp = 80 + stats.vitality * 2 + (selectedClass === "Defensa" ? 15 : 0);
    playerHp = maxPlayerHp;
    maxEnemyHp = 95 + Math.floor(Math.random() * 21);
    enemyHp = maxEnemyHp;
    maxEnergy = 20 + stats.energy;
    energy = maxEnergy;
    defending = false; battleOver = false; turn = 0;
    $("#playerEmblem").textContent = classes[selectedClass].icon;
    $("#playerName").textContent = selectedClass;
    $("#playerBuild").textContent = `${$("#specialty").value} · ${$("#affinity").value}`;
    $("#enemyName").textContent = enemyNames[Math.floor(Math.random() * enemyNames.length)];
    $("#enemyStatus").textContent = "Analizando tu estrategia...";
    $("#battleLog").innerHTML = "";
    $("#resultBanner").classList.add("hidden");
    $("#battleSection").classList.remove("hidden");
    log(`Duelo iniciado: ${selectedClass} de ${$("#specialty").value} contra ${$("#enemyName").textContent}.`);
    log(`Pasiva activa: ${classes[selectedClass].passive}.`);
    updateBars();
    $("#battleSection").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#newBuild").addEventListener("click", () => {
    $("#battleSection").classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  updateClass();
  renderStats();
})();