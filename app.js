const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STORAGE_KEY = "weeklySchedulePlanner";

const dailyTemplate = [
  { title: "Shacharit", start: "07:15", end: "08:00", notes: "" },
  { title: "Halacha seder", start: "08:00", end: "08:30", notes: "" },
  { title: "Breakfast", start: "08:30", end: "09:00", notes: "" },
  { title: "Pre shiur", start: "09:00", end: "09:30", notes: "" },
  { title: "Morning Seder", start: "09:30", end: "11:40", notes: "" },
  { title: "Shiur", start: "11:40", end: "13:00", notes: "" },
  { title: "Lunch Break", start: "13:00", end: "15:00", notes: "" },
  { title: "Mincha", start: "15:00", end: "15:15", notes: "" },
  { title: "Sup Shuir", start: "15:15", end: "16:00", notes: "" },
  { title: "Shnay Mikra Seder", start: "16:00", end: "16:30", notes: "" },
  { title: "Bekiyas seder", start: "16:30", end: "17:45", notes: "" },
  { title: "Reading Groups", start: "17:45", end: "18:15", notes: "" },
  { title: "Ulpan/IC", start: "18:15", end: "19:00", notes: "" },
  { title: "Mussar Seder", start: "19:00", end: "19:30", notes: "" },
  { title: "Dinner Break", start: "19:30", end: "20:15", notes: "" },
  { title: "Maariv", start: "20:15", end: "20:30", notes: "" },
  { title: "Night Seder", start: "20:30", end: "22:30", notes: "" },
];

const defaultSchedule = Object.fromEntries(
  DAYS.map((dayName) => [dayName, dailyTemplate.map((task) => ({ ...task, notes: "" }))])
);

async function hashString(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const form = document.getElementById("scheduleForm");
const weekGrid = document.getElementById("weekGrid");
const weekDaySelector = document.getElementById("weekDaySelector");
const currentTaskTitle = document.getElementById("currentTaskTitle");
const currentTaskDetails = document.getElementById("currentTaskDetails");
const currentDayLabel = document.getElementById("currentDayLabel");
const currentTimeLabel = document.getElementById("currentTimeLabel");
const resetButton = document.getElementById("resetButton");
const todayTasks = document.getElementById("todayTasks");
const todayHeading = document.getElementById("todayHeading");
const navButtons = document.querySelectorAll(".nav-button");
const viewPanels = document.querySelectorAll(".view-panel");

let schedule = loadSchedule();
let activeView = "today";

function loadSchedule() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return structuredClone(defaultSchedule);
  }

  try {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn("Could not parse saved schedule, using default week.", error);
  }

  return structuredClone(defaultSchedule);
}

function saveSchedule() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

function toMinutes(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function sortScheduleItems(dayName) {
  (schedule[dayName] || []).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

function getTodayName() {
  return DAYS[new Date().getDay()];
}

function getCurrentScheduleTask() {
  const today = getTodayName();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayItems = schedule[today] || [];

  const activeTask = todayItems.find((item) => {
    const startMinutes = toMinutes(item.start);
    const endMinutes = toMinutes(item.end);
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  });

  if (activeTask) {
    return { task: activeTask, day: today, status: "active" };
  }

  const nextTask = [...todayItems]
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    .find((item) => toMinutes(item.start) > nowMinutes);

  if (nextTask) {
    return { task: nextTask, day: today, status: "next" };
  }

  return { task: null, day: today, status: "idle" };
}

function setActiveView(viewName) {
  activeView = viewName;

  navButtons.forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  viewPanels.forEach((panel) => {
    const shouldShow = panel.id === `${viewName}View`;
    panel.classList.toggle("hidden", !shouldShow);
    panel.classList.toggle("active", shouldShow);
  });
}

function renderCurrentStatus() {
  const now = new Date();
  const today = getTodayName();
  const currentTaskInfo = getCurrentScheduleTask();

  currentDayLabel.textContent = today;
  currentTimeLabel.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  todayHeading.textContent = `${today} activities`;

  if (!currentTaskInfo.task) {
    currentTaskTitle.textContent = "Nothing scheduled right now";
    currentTaskDetails.innerHTML = "You have a free block at the moment. Add a new task to fill it in.";
    return;
  }

  const { task, status } = currentTaskInfo;
  const taskTime = `${formatTime(task.start)} - ${formatTime(task.end)}`;

  currentTaskTitle.textContent = task.title;

  if (status === "active") {
    currentTaskDetails.innerHTML = `
      <strong>Current activity</strong><br />
      ${taskTime}<br />
      ${task.notes ? task.notes : "No notes added."}
    `;
  } else {
    currentTaskDetails.innerHTML = `
      <strong>Next up</strong><br />
      ${task.title}<br />
      ${taskTime}<br />
      ${task.notes ? task.notes : "No notes added."}
    `;
  }
}

function renderTodayTasks() {
  const todayName = getTodayName();
  const tasks = (schedule[todayName] || []).slice().sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  todayTasks.innerHTML = "";

  if (tasks.length === 0) {
    todayTasks.innerHTML = '<div class="empty-state">No tasks for today yet.</div>';
    return;
  }

  tasks.forEach((task) => {
    const startMinutes = toMinutes(task.start);
    const endMinutes = toMinutes(task.end);
    const isActive = nowMinutes >= startMinutes && nowMinutes < endMinutes;

    const item = document.createElement("article");
    item.className = `task-item ${isActive ? "active" : ""}`;

    const status = document.createElement("span");
    status.className = "task-status";
    status.textContent = isActive ? "Now" : "Planned";

    const header = document.createElement("div");
    header.className = "task-item-header";

    const title = document.createElement("h4");
    title.className = "task-title";
    title.textContent = task.title;

    const time = document.createElement("span");
    time.className = "task-time";
    time.textContent = `${formatTime(task.start)} - ${formatTime(task.end)}`;

    const notes = document.createElement("p");
    notes.className = "task-notes";
    notes.textContent = task.notes ? task.notes : "";
    if (!task.notes || !task.notes.trim()) {
      notes.style.display = "none";
    }

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      const dayTasks = schedule[todayName];
      const index = dayTasks.findIndex((entry) => entry.title === task.title && entry.start === task.start && entry.end === task.end);
      if (index >= 0) {
        dayTasks.splice(index, 1);
        saveSchedule();
        renderTodayTasks();
        renderWeek();
        renderCurrentStatus();
      }
    });

    header.append(title, status);
    actions.appendChild(removeButton);
    item.append(header, time, notes, actions);
    todayTasks.appendChild(item);
  });
}

function openEditTaskModal(dayName, taskIndex) {
  const task = schedule[dayName][taskIndex];
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "task-modal";

  const title = document.createElement("h3");
  title.textContent = "Edit task";

  const form = document.createElement("form");
  form.className = "edit-task-form";

  const fields = document.createElement("div");
  fields.className = "edit-fields";

  const dayField = document.createElement("label");
  dayField.innerHTML = `
    <span>Day</span>
    <select class="edit-day-select">
      ${DAYS.map((day) => `<option value="${day}" ${day === dayName ? "selected" : ""}>${day}</option>`).join("")}
    </select>
  `;

  const titleField = document.createElement("label");
  titleField.innerHTML = `
    <span>Title</span>
    <input type="text" class="edit-title-input" value="${task.title.replace(/"/g, '&quot;')}" required />
  `;

  const startField = document.createElement("label");
  startField.innerHTML = `
    <span>Start</span>
    <input type="time" class="edit-start-input" value="${task.start}" required />
  `;

  const endField = document.createElement("label");
  endField.innerHTML = `
    <span>End</span>
    <input type="time" class="edit-end-input" value="${task.end}" required />
  `;

  const notesField = document.createElement("label");
  notesField.innerHTML = `
    <span>Notes</span>
    <textarea rows="3" class="edit-notes-input">${task.notes || ""}</textarea>
  `;

  fields.append(dayField, titleField, startField, endField, notesField);

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "secondary-button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", () => overlay.remove());

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "primary-button";
  saveButton.textContent = "Save changes";

  actions.append(cancelButton, saveButton);
  form.append(fields, actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const newDay = form.querySelector(".edit-day-select").value;
    const updatedTask = {
      title: form.querySelector(".edit-title-input").value.trim(),
      start: form.querySelector(".edit-start-input").value,
      end: form.querySelector(".edit-end-input").value,
      notes: form.querySelector(".edit-notes-input").value.trim(),
    };

    if (!updatedTask.title || !updatedTask.start || !updatedTask.end) {
      return;
    }

    if (toMinutes(updatedTask.end) <= toMinutes(updatedTask.start)) {
      alert("End time must be later than the start time.");
      return;
    }

    if (!schedule[newDay]) {
      schedule[newDay] = [];
    }

    if (dayName !== newDay) {
      schedule[dayName].splice(taskIndex, 1);
      schedule[newDay].push(updatedTask);
      sortScheduleItems(newDay);
    } else {
      schedule[dayName][taskIndex] = updatedTask;
      sortScheduleItems(newDay);
    }

    saveSchedule();
    overlay.remove();
    renderTodayTasks();
    renderWeek();
    renderCurrentStatus();
  });

  modal.append(title, form);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function renderWeek() {
  weekGrid.innerHTML = "";
  const todayName = getTodayName();
  const selectedDay = weekDaySelector.value || todayName;
  weekDaySelector.value = selectedDay;

  const dayName = selectedDay;
  const dayCard = document.createElement("section");
  dayCard.className = `day-card ${dayName === todayName ? "today" : ""}`;

  const heading = document.createElement("h3");
  heading.textContent = dayName;
  dayCard.appendChild(heading);

  const taskList = document.createElement("div");
  taskList.className = "task-list";

  const tasks = (schedule[dayName] || []).slice().sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  if (tasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-day";
    empty.textContent = "No tasks yet";
    taskList.appendChild(empty);
  } else {
    tasks.forEach((task) => {
      const originalIndex = schedule[dayName].findIndex((entry) => entry === task);
      const item = document.createElement("div");
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const isActive =
        dayName === todayName &&
        nowMinutes >= toMinutes(task.start) &&
        nowMinutes < toMinutes(task.end);

      item.className = `task-item ${isActive ? "active" : ""}`;

      const header = document.createElement("div");
      header.className = "task-item-header";

      const title = document.createElement("span");
      title.className = "task-title";
      title.textContent = task.title;

      const time = document.createElement("span");
      time.className = "task-time";
      time.textContent = `${formatTime(task.start)} - ${formatTime(task.end)}`;

      header.append(title, time);

      const notes = document.createElement("p");
      notes.className = "task-notes";
      notes.textContent = task.notes ? task.notes : "";
      if (!task.notes || !task.notes.trim()) {
        notes.style.display = "none";
      }

      const actions = document.createElement("div");
      actions.className = "task-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "secondary-button small-button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => openEditTaskModal(dayName, originalIndex));

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        schedule[dayName].splice(originalIndex, 1);
        saveSchedule();
        renderTodayTasks();
        renderWeek();
        renderCurrentStatus();
      });

      actions.append(editButton, removeButton);
      item.append(header, notes, actions);
      taskList.appendChild(item);
    });
  }

  dayCard.appendChild(taskList);
  weekGrid.appendChild(dayCard);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const day = document.getElementById("day").value;
  const title = document.getElementById("title").value.trim();
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const notes = document.getElementById("notes").value.trim();

  if (!day || !title || !start || !end) {
    return;
  }

  if (toMinutes(end) <= toMinutes(start)) {
    alert("End time must be later than the start time.");
    return;
  }

  if (!schedule[day]) {
    schedule[day] = [];
  }

  schedule[day].push({ title, start, end, notes });
  sortScheduleItems(day);
  saveSchedule();
  form.reset();
  document.getElementById("day").value = getTodayName();
  renderTodayTasks();
  renderWeek();
  renderCurrentStatus();
  setActiveView("today");
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.view));
});

weekDaySelector.addEventListener("change", () => {
  renderWeek();
});

resetButton.addEventListener("click", () => {
  schedule = Object.fromEntries(
    DAYS.map((dayName) => [dayName, dailyTemplate.map((task) => ({ ...task, notes: "" }))])
  );
  saveSchedule();
  renderTodayTasks();
  renderWeek();
  renderCurrentStatus();
  setActiveView("today");
});

async function initializeApp() {
  const validUsernameHash = await hashString("jackmorganstein");
  const validPasswordHash = await hashString("Charlie");
  const storedUsernameHash = localStorage.getItem("weeklyScheduleUsernameHash");
  const storedPasswordHash = localStorage.getItem("weeklySchedulePasswordHash");

  if (
    localStorage.getItem("weeklyScheduleLoggedIn") !== "true" ||
    storedUsernameHash !== validUsernameHash ||
    storedPasswordHash !== validPasswordHash
  ) {
    localStorage.removeItem("weeklyScheduleLoggedIn");
    window.location.href = "login.html";
    return;
  }

  renderTodayTasks();
  renderWeek();
  renderCurrentStatus();
  setActiveView("today");

  setInterval(() => {
    renderTodayTasks();
    renderWeek();
    renderCurrentStatus();
  }, 30000);
}

initializeApp();
