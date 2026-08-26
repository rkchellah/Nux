from fastapi import APIRouter, HTTPException, Query

from app.services.memory_service import memory_service

router = APIRouter(prefix="/memories", tags=["memories"])


@router.get("")
async def list_memories(user_id: str = Query(..., min_length=1)):
    items = await memory_service.list_memories(user_id)
    return {"memories": items}


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    user_id: str = Query(..., min_length=1),
):
    deleted = await memory_service.delete_memory(user_id, memory_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"deleted": memory_id}


@router.delete("")
async def delete_all_memories(user_id: str = Query(..., min_length=1)):
    count = await memory_service.delete_all_memories(user_id)
    return {"deleted_count": count}
