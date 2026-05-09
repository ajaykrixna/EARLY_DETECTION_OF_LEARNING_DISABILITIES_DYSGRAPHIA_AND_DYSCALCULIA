from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from datetime import datetime
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
import models
from database import get_db
from dependencies import get_current_user
from services.dysgraphia_service import DysgraphiaService

router = APIRouter(prefix="/api/dysgraphia", tags=["Dysgraphia"])
dysgraphia_service = DysgraphiaService()

ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"]

@router.post("/predict")
async def predict_dysgraphia(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)  
):
    try:
        # Validate file type
        if file.content_type not in ALLOWED_MIME_TYPES:
             raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG and PNG allowed.")

        contents = await file.read()
        
        # Save file to disk
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{uuid.uuid4()}.{file_ext}"
        os.makedirs("uploads/dysgraphia", exist_ok=True)
        file_path = f"uploads/dysgraphia/{filename}"
        
        with open(file_path, "wb") as f:
            f.write(contents)
            
        # Construct URL
        # Ideally this domain should be from config
        image_url = f"http://localhost:8000/static/dysgraphia/{filename}"
        
        result = await dysgraphia_service.predict(contents, current_user.id)

        # Save to DB
        db_record = models.DysgraphiaTest(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            image_url=image_url,
            prediction_class=result.get("prediction_class", "Unknown"),
            confidence_score=result.get("confidence_score", 0.0),
            gradcam_url=result.get("gradcam_url", ""),
            model_version=result.get("model_version", "1.0")
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        
        result["test_id"] = db_record.id
        result["image_url"] = image_url
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict_batch")
async def predict_dysgraphia_batch(
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db) 
):
    try:
        image_bytes_list = []
        image_urls = []
        
        os.makedirs("uploads/dysgraphia", exist_ok=True)
        
        for file in files:
            if file.content_type not in ALLOWED_MIME_TYPES:
                 continue # Skip invalid files in batch or raise error? Skipping for now.
            
            content = await file.read()
            image_bytes_list.append(content)
            
            file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
            filename = f"{uuid.uuid4()}.{file_ext}"
            file_path = f"uploads/dysgraphia/{filename}"
            
            with open(file_path, "wb") as f:
                f.write(content)
                
            image_urls.append(f"http://localhost:8000/static/dysgraphia/{filename}")
            
        if not image_bytes_list:
             raise HTTPException(status_code=400, detail="No valid images provided")

        result = await dysgraphia_service.predict_batch(image_bytes_list, current_user.id)

        saved_predictions = []
        predictions = result.get("predictions", [])
        
        for i, pred in enumerate(predictions):
             url = image_urls[i] if i < len(image_urls) else ""
             
             db_record = models.DysgraphiaTest(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                image_url=url,
                prediction_class=pred.get("prediction_class", "Unknown"),
                confidence_score=pred.get("confidence_score", 0.0),
                gradcam_url=pred.get("gradcam_url", ""),
                model_version="1.0"
            )
             db.add(db_record)
             saved_predictions.append(db_record)
        
        db.commit()
        
        for i, record in enumerate(saved_predictions):
            if i < len(predictions):
                predictions[i]["test_id"] = record.id
                predictions[i]["image_url"] = record.image_url

        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
