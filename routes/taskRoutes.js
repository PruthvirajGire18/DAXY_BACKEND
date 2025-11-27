const express = require("express");
const Task = require("../models/Task");
const { auth, adminOnly } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/tasks
 *  - Admin  -> all tasks
 *  - Intern -> only tasks where assignedTo = own email
 */
router.get("/", auth, async (req, res) => {
  try {
    let tasks;

    if (req.user.role === "admin") {
      tasks = await Task.find().sort({ createdAt: -1 });
    } else {
      tasks = await Task.find({ assignedTo: req.user.email }).sort({
        createdAt: -1,
      });
    }

    res.json(tasks);
  } catch (err) {
    console.error("Get tasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/tasks
 *  - Admin  -> can assign to anyone (assignedTo from body)
 *  - Intern -> self-task only, forced assignedTo = own email
 *  - Also sets isSelfTask flag (used for "Self Task" badge)
 */
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, assignedTo, status, priority, dueDate } =
      req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "Title and description are required" });
    }

    let finalAssignedTo = assignedTo;

    // intern -> sirf khud ko assign kar sakta hai
    if (req.user.role !== "admin") {
      finalAssignedTo = req.user.email;
    }

    const assignedEmail = (finalAssignedTo || req.user.email || "").toLowerCase();
    const currentUserEmail = (req.user.email || "").toLowerCase();

    // 👇 yahi se pata chalega ki self-task hai kya
    const isSelfTask =
      assignedEmail && currentUserEmail && assignedEmail === currentUserEmail;

    const newTask = await Task.create({
      title,
      description,
      assignedTo: assignedEmail, // normalize email
      status: status || "todo",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: req.user._id,
      isSelfTask,
    });

    res.status(201).json(newTask);
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/tasks/:id
 *  - Admin  -> can edit everything
 *  - Intern -> only its own tasks; can change status & add progress notes
 */
router.patch("/:id", auth, async (req, res) => {
  try {
    const taskId = req.params.id;
    const updates = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // intern cannot touch tasks not assigned to them
    if (req.user.role !== "admin" && task.assignedTo !== req.user.email) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (req.user.role !== "admin") {
      // INTERN: only status + new progressNote
      if (updates.status) task.status = updates.status;

      if (updates.progressNote) {
        task.progressNotes.push({ text: updates.progressNote });
      }
    } else {
      // ADMIN: full control
      if (updates.title !== undefined) task.title = updates.title;
      if (updates.description !== undefined)
        task.description = updates.description;
      if (updates.assignedTo !== undefined) {
        const newAssigned = updates.assignedTo.toLowerCase();
        task.assignedTo = newAssigned;

        // admin jab re-assign kare to isSelfTask bhi recalc kar le
        const userEmail = (req.user.email || "").toLowerCase();
        task.isSelfTask = newAssigned === userEmail;
      }
      if (updates.status !== undefined) task.status = updates.status;
      if (updates.priority !== undefined) task.priority = updates.priority;
      if (updates.dueDate !== undefined)
        task.dueDate = updates.dueDate ? new Date(updates.dueDate) : undefined;
      if (updates.progressNote) {
        task.progressNotes.push({ text: updates.progressNote });
      }
    }

    await task.save();
    res.json(task);
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/tasks/:id
 *  - Admin only
 */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const taskId = req.params.id;
    const deleted = await Task.findByIdAndDelete(taskId);
    if (!deleted) return res.status(404).json({ message: "Task not found" });

    res.json({ message: "Task deleted", id: taskId });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
