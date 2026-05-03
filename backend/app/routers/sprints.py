from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import Sprint, SprintTask, User, ChangeRequest, Project
from ..dependencies import get_current_user

router = APIRouter(prefix="/sprints", tags=["Sprints"])

@router.get("/{project_id}", response_model=List[dict])
def get_sprints(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sprints = db.query(Sprint).filter(Sprint.project_id == project_id).all()
    return [{"id": s.id, "name": s.name, "goal": s.goal, "start_date": s.start_date, "end_date": s.end_date, "status": s.status} for s in sprints]

@router.post("/")
def create_sprint(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sprint = Sprint(
        project_id=data["project_id"],
        name=data["name"],
        goal=data.get("goal"),
        start_date=datetime.strptime(data["start_date"], "%Y-%m-%d").date() if data.get("start_date") else None,
        end_date=datetime.strptime(data["end_date"], "%Y-%m-%d").date() if data.get("end_date") else None,
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint

@router.get("/{sprint_id}/tasks")
def get_sprint_tasks(sprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tasks = db.query(SprintTask).filter(SprintTask.sprint_id == sprint_id).all()
    return [{"id": t.id, "title": t.title, "status": t.status, "estimated_hours": t.estimated_hours, "actual_hours": t.actual_hours, "assigned_to": t.assigned_to} for t in tasks]

@router.post("/{sprint_id}/tasks")
def create_sprint_task(sprint_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = SprintTask(
        sprint_id=sprint_id,
        change_request_id=data.get("change_request_id"),
        title=data["title"],
        status=data.get("status", "todo"),
        estimated_hours=data.get("estimated_hours"),
        assigned_to=data.get("assigned_to"),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.put("/{sprint_id}/tasks/{task_id}")
def update_sprint_task(sprint_id: int, task_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(SprintTask).filter(SprintTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if "status" in data: task.status = data["status"]
    if "actual_hours" in data: task.actual_hours = data["actual_hours"]
    db.commit()
    db.refresh(task)
    return task
