
const STORAGE_KEY = 'imboni-community-planner-v1'

const TASK_CATEGORIES = [
  'Environment',
  'Education',
  'Health',
  'Community Support',
  'Other',
]

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
}

const taskForm = document.querySelector('#task-form')
const taskInput = document.querySelector('#task-input')
const categoryInput = document.querySelector('#task-category')
const priorityInput = document.querySelector('#task-priority')
const dueDateInput = document.querySelector('#task-due-date')
const formError = document.querySelector('#form-error')
const characterCount = document.querySelector('#character-count')
const taskList = document.querySelector('#task-list')
const taskCount = document.querySelector('#task-count')
const emptyState = document.querySelector('#empty-state')
const emptyTitle = document.querySelector('#empty-title')
const emptyMessage = document.querySelector('#empty-message')
const filterControls = document.querySelector('#filter-controls')
const categoryFilter = document.querySelector('#category-filter')
const clearCompletedButton = document.querySelector('#clear-completed')
const progressSummary = document.querySelector('#progress-summary')
const progressTrack = document.querySelector('#progress-track')
const progressBar = document.querySelector('#progress-bar')

// Load the saved application state, or use sensible defaults.
const savedState = loadTasks()
let tasks = savedState.tasks
let currentFilter = savedState.filter
let currentCategory = savedState.category
let editingId = null

// Load saved tasks and filters without trusting malformed stored data.
function loadTasks() {
  const defaults = { tasks: [], filter: 'all', category: 'all' }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return defaults
    }

    const data = JSON.parse(stored)

    if (!data || !Array.isArray(data.tasks)) {
      return defaults
    }

    const validTasks = data.tasks.filter((task) => {
      return (
        task &&
        typeof task.id === 'string' &&
        typeof task.text === 'string' &&
        task.text.trim().length > 0 &&
        task.text.length <= 100 &&
        typeof task.done === 'boolean' &&
        TASK_CATEGORIES.includes(task.category) &&
        Object.hasOwn(PRIORITY_ORDER, task.priority) &&
        typeof task.dueDate === 'string'
      )
    })

    const validFilter = ['all', 'active', 'completed'].includes(data.filter)
      ? data.filter
      : 'all'

    const validCategory =
      data.category === 'all' || TASK_CATEGORIES.includes(data.category)
        ? data.category
        : 'all'

    return {
      tasks: validTasks,
      filter: validFilter,
      category: validCategory,
    }
  } catch (error) {
    console.error('Could not load Imboni data:', error)
    return defaults
  }
}

// Save the task array and selected filters in localStorage.
function saveTasks() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks,
        filter: currentFilter,
        category: currentCategory,
      }),
    )
  } catch (error) {
    console.error('Could not save Imboni data:', error)
    showError('Your changes could not be saved in this browser.')
  }
}

// Update the state first, save it, and then refresh the interface.
function updateState(changeFn) {
  changeFn()
  saveTasks()
  render()
}

// Display a validation or storage error on the page.
function showError(message) {
  formError.textContent = message
  formError.classList.remove('hidden')
}

// Clear the error after the user starts correcting the form.
function clearError() {
  formError.textContent = ''
  formError.classList.add('hidden')
}

// Update the character count and its warning color.
function updateCharacterCount() {
  const length = taskInput.value.length
  characterCount.textContent = `${length} / 100`
  characterCount.classList.toggle('text-red-700', length > 100)
}

// Add a new community activity after validating the form.
function addTask(event) {
  event.preventDefault()
  clearError()

  const text = taskInput.value.trim()

  if (!text) {
    showError('Please enter an activity name.')
    taskInput.focus()
    return
  }

  if (text.length > 100) {
    showError('Activity names must be 100 characters or fewer.')
    taskInput.focus()
    return
  }

  const task = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    done: false,
    category: categoryInput.value,
    priority: priorityInput.value,
    dueDate: dueDateInput.value,
    createdAt: Date.now(),
  }

  updateState(() => {
    tasks.push(task)
    currentFilter = 'all'
    currentCategory = 'all'
    editingId = null
  })

  categoryFilter.value = currentCategory
  taskForm.reset()
  priorityInput.value = 'medium'
  updateCharacterCount()
  taskInput.focus()
}

// Find a task by its unique identifier.
function findTask(id) {
  return tasks.find((task) => task.id === id)
}

// Mark a task complete or active.
function toggleTask(id) {
  updateState(() => {
    const task = findTask(id)

    if (task) {
      task.done = !task.done
    }
  })
}

// Delete a task after asking the user for confirmation.
function deleteTask(id) {
  const task = findTask(id)

  if (!task) {
    return
  }

  const confirmed = window.confirm(`Delete "${task.text}"?`)

  if (!confirmed) {
    return
  }

  updateState(() => {
    tasks = tasks.filter((item) => item.id !== id)

    if (editingId === id) {
      editingId = null
    }
  })
}

// Open the inline editor for the selected task.
function editTask(id) {
  if (!findTask(id)) {
    return
  }

  editingId = id
  render()

  const editInput = taskList.querySelector(
    `[data-edit-input="${CSS.escape(id)}"]`,
  )

  if (editInput) {
    editInput.focus()
    editInput.select()
  }
}

// Validate and save the updated text of an activity.
function saveEdit(id, inputValue) {
  const text = inputValue.trim()

  if (!text) {
    showError('An activity name cannot be empty.')
    return
  }

  if (text.length > 100) {
    showError('Activity names must be 100 characters or fewer.')
    return
  }

  clearError()

  updateState(() => {
    const task = findTask(id)

    if (task) {
      task.text = text
    }

    editingId = null
  })
}

// Return tasks matching the status and category filters.
function getVisibleTasks() {
  return tasks
    .filter((task) => {
      const matchesStatus =
        currentFilter === 'all' ||
        (currentFilter === 'active' && !task.done) ||
        (currentFilter === 'completed' && task.done)

      const matchesCategory =
        currentCategory === 'all' || task.category === currentCategory

      return matchesStatus && matchesCategory
    })
    .sort((a, b) => {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        (a.dueDate || '9999-12-31').localeCompare(
          b.dueDate || '9999-12-31',
        ) ||
        a.createdAt - b.createdAt
    })
}

// Format a date without changing its calendar day.
function formatDate(dateString) {
  if (!dateString) {
    return ''
  }

  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Return the due-date label and its visual style.
function getDueInfo(task) {
  if (!task.dueDate) {
    return null
  }

  const today = new Date()
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  if (!task.done && task.dueDate < todayString) {
    return { text: `Overdue · ${formatDate(task.dueDate)}`, style: 'bg-red-100 text-red-800' }
  }

  if (!task.done && task.dueDate === todayString) {
    return { text: 'Due today', style: 'bg-amber-100 text-amber-900' }
  }

  return { text: `Due ${formatDate(task.dueDate)}`, style: 'bg-[#F1F3EB] text-[#526052]' }
}

// Create a small badge using safe text insertion.
function createBadge(text, className) {
  const badge = document.createElement('span')
  badge.className = `inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-bold ${className}`
  badge.textContent = text
  return badge
}

// Create a button with a label and delegated action.
function createActionButton(text, action, id, extraClass = '') {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `task-action ${extraClass}`
  button.textContent = text
  button.dataset.action = action
  button.dataset.id = id
  button.setAttribute('aria-label', `${text} activity`)
  return button
}

// Create a task row entirely with DOM methods and textContent.
function createTaskElement(task) {
  const item = document.createElement('li')
  item.className = `rounded-xl border border-[#E1E6DA] p-4 transition ${
    task.done ? 'task-completed bg-[#F8F9F4]' : 'bg-white'
  }`

  const row = document.createElement('div')
  row.className = 'flex min-w-0 items-start gap-3'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'task-checkbox mt-1'
  checkbox.checked = task.done
  checkbox.dataset.action = 'toggle'
  checkbox.dataset.id = task.id
  checkbox.setAttribute(
    'aria-label',
    `${task.done ? 'Mark active' : 'Mark complete'}: ${task.text}`,
  )

  const content = document.createElement('div')
  content.className = 'min-w-0 flex-1'

  if (editingId === task.id) {
    const editInput = document.createElement('input')
    editInput.type = 'text'
    editInput.value = task.text
    editInput.maxLength = 120
    editInput.className = 'task-edit-input'
    editInput.dataset.editInput = task.id
    editInput.setAttribute('aria-label', 'Edit activity name')
    editInput.setAttribute('aria-describedby', 'form-error')
    content.append(editInput)

    const hint = document.createElement('p')
    hint.className = 'mt-2 text-xs text-[#687665]'
    hint.textContent = 'Press Enter to save or Escape to cancel.'
    content.append(hint)
  } else {
    const title = document.createElement('p')
    title.className = 'task-text font-bold leading-6'
    title.textContent = task.text
    content.append(title)
  }

  const badges = document.createElement('div')
  badges.className = 'mt-3 flex flex-wrap gap-2'

  badges.append(
    createBadge(task.category, 'bg-[#E7EFDD] text-[#36583C]'),
  )

  const priorityStyles = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-amber-100 text-amber-900',
    low: 'bg-sky-100 text-sky-800',
  }

  badges.append(
    createBadge(
      `${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`,
      priorityStyles[task.priority],
    ),
  )

  const dueInfo = getDueInfo(task)

  if (dueInfo) {
    badges.append(createBadge(dueInfo.text, dueInfo.style))
  }

  content.append(badges)
  row.append(checkbox, content)
  item.append(row)

  const actions = document.createElement('div')
  actions.className = 'mt-3 flex flex-wrap gap-2 border-t border-[#EDF0E8] pt-3'

  if (editingId === task.id) {
    actions.append(
      createActionButton('Save', 'save', task.id, 'bg-[#293B2B] text-white hover:bg-[#405A3D]'),
      createActionButton('Cancel', 'cancel', task.id, 'bg-[#F1F3EB] text-[#526052] hover:bg-[#E1E8D8]'),
    )
  } else {
    actions.append(
      createActionButton('Edit', 'edit', task.id, 'bg-[#F1F3EB] text-[#526052] hover:bg-[#E1E8D8]'),
      createActionButton('Delete', 'delete', task.id, 'bg-red-50 text-red-700 hover:bg-red-100'),
    )
  }

  item.append(actions)
  return item
}

// Update the counter, progress, filters, and visible task list.
function render() {
  const fragment = document.createDocumentFragment()
  const visibleTasks = getVisibleTasks()
  const remaining = tasks.filter((task) => !task.done).length
  const completed = tasks.length - remaining
  const progress = tasks.length === 0
    ? 0
    : Math.round((completed / tasks.length) * 100)

  taskCount.textContent = `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left`
  progressSummary.textContent = `${completed} of ${tasks.length} completed`
  progressBar.style.width = `${progress}%`
  progressTrack.setAttribute('aria-valuenow', String(progress))
  clearCompletedButton.disabled = completed === 0

  filterControls.querySelectorAll('[data-filter]').forEach((button) => {
    const active = button.dataset.filter === currentFilter

    button.setAttribute('aria-pressed', String(active))
    button.classList.toggle('bg-[#293B2B]', active)
    button.classList.toggle('text-white', active)
    button.classList.toggle('bg-[#F1F3EB]', !active)
    button.classList.toggle('text-[#526052]', !active)
  })

  visibleTasks.forEach((task) => {
    fragment.append(createTaskElement(task))
  })

  taskList.replaceChildren(fragment)
  emptyState.classList.toggle('hidden', visibleTasks.length > 0)

  if (visibleTasks.length === 0) {
    if (currentFilter === 'completed') {
      emptyTitle.textContent = 'No completed activities yet'
      emptyMessage.textContent = 'Complete an activity and it will appear here.'
    } else if (currentFilter === 'active') {
      emptyTitle.textContent = 'No active activities'
      emptyMessage.textContent = 'You have no active activities matching this selection.'
    } else if (currentCategory !== 'all') {
      emptyTitle.textContent = 'No activities in this category'
      emptyMessage.textContent = 'Try another category or add a new community activity.'
    } else {
      emptyTitle.textContent = 'Your community journey starts here'
      emptyMessage.textContent = 'Add your first activity and start making a positive difference.'
    }
  }
}

// Remove completed tasks after asking for confirmation.
function clearCompleted() {
  const completed = tasks.filter((task) => task.done).length

  if (completed === 0) {
    return
  }

  const confirmed = window.confirm(
    `Clear ${completed} completed ${completed === 1 ? 'activity' : 'activities'}?`,
  )

  if (!confirmed) {
    return
  }

  updateState(() => {
    tasks = tasks.filter((task) => !task.done)

    if (editingId && !findTask(editingId)) {
      editingId = null
    }
  })
}

// Handle task action buttons using one delegated click listener.
function handleTaskClick(event) {
  const button = event.target.closest('button[data-action]')

  if (!button || !taskList.contains(button)) {
    return
  }

  const { action, id } = button.dataset

  if (action === 'edit') {
    clearError()
    editTask(id)
  } else if (action === 'save') {
    const input = taskList.querySelector(
      `[data-edit-input="${CSS.escape(id)}"]`,
    )

    if (input) {
      saveEdit(id, input.value)
    }
  } else if (action === 'cancel') {
    clearError()
    editingId = null
    render()
  } else if (action === 'delete') {
    deleteTask(id)
  }
}

// Handle checkbox changes through event delegation.
function handleTaskChange(event) {
  const checkbox = event.target

  if (
    checkbox instanceof HTMLInputElement &&
    checkbox.type === 'checkbox' &&
    checkbox.dataset.action === 'toggle'
  ) {
    toggleTask(checkbox.dataset.id)
  }
}

// Save edits with Enter and cancel them with Escape.
function handleTaskKeydown(event) {
  const input = event.target

  if (
    !(input instanceof HTMLInputElement) ||
    !input.hasAttribute('data-edit-input')
  ) {
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    saveEdit(input.dataset.editInput, input.value)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    clearError()
    editingId = null
    render()
  }
}

// Register all application event listeners.
function registerEvents() {
  taskForm.addEventListener('submit', addTask)

  taskInput.addEventListener('input', () => {
    clearError()
    updateCharacterCount()
  })

  filterControls.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-filter]')

    if (!button || !filterControls.contains(button)) {
      return
    }

    currentFilter = button.dataset.filter
    editingId = null
    saveTasks()
    render()
  })

  categoryFilter.addEventListener('change', () => {
    currentCategory = categoryFilter.value
    editingId = null
    saveTasks()
    render()
  })

  clearCompletedButton.addEventListener('click', clearCompleted)

  taskList.addEventListener('click', handleTaskClick)
  taskList.addEventListener('change', handleTaskChange)
  taskList.addEventListener('keydown', handleTaskKeydown)
}

// responsiveness button popout
function setupMobileMenu() {
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const openIcon = document.getElementById("menu-open-icon");
  const closeIcon = document.getElementById("menu-close-icon");

  if (!menuToggle || !mobileMenu) return;

  function closeMenu() {
    mobileMenu.classList.add("hidden");
    openIcon?.classList.remove("hidden");
    closeIcon?.classList.add("hidden");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
  }

  menuToggle.addEventListener("click", () => {
    const isOpen = !mobileMenu.classList.contains("hidden");

    if (isOpen) {
      closeMenu();
    } else {
      mobileMenu.classList.remove("hidden");
      openIcon?.classList.add("hidden");
      closeIcon?.classList.remove("hidden");

      menuToggle.setAttribute("aria-expanded", "true");
      menuToggle.setAttribute("aria-label", "Close navigation menu");
    }
  });

  // Close the menu after clicking a navigation link.
  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Close the menu when switching to desktop size.
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) {
      closeMenu();
    }
  });
}

setupMobileMenu();

// Restore saved filters and show the initial interface.
function init() {
  categoryFilter.value = currentCategory
  updateCharacterCount()
  registerEvents()
  render()
}

init()
