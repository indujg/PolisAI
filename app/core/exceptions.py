from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.logging import get_logger

logger = get_logger(__name__)


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: str | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
    request_id: str | None = None


# --- Domain exceptions ---

class PolisAIError(Exception):
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred"

    def __init__(self, message: str | None = None, code: str | None = None) -> None:
        self.message = message or self.__class__.message
        self.code = code or self.__class__.code
        super().__init__(self.message)


class NotFoundError(PolisAIError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"
    message = "Resource not found"


class UnauthorizedError(PolisAIError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "UNAUTHORIZED"
    message = "Authentication required"


class ForbiddenError(PolisAIError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "FORBIDDEN"
    message = "Insufficient permissions"


class ConflictError(PolisAIError):
    status_code = status.HTTP_409_CONFLICT
    code = "CONFLICT"
    message = "Resource conflict"


class ValidationError(PolisAIError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "VALIDATION_ERROR"
    message = "Validation failed"


class ServiceUnavailableError(PolisAIError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "SERVICE_UNAVAILABLE"
    message = "Service temporarily unavailable"


# --- Handlers ---

def _request_id(request: Request) -> str | None:
    return request.state.__dict__.get("request_id")


async def polisai_exception_handler(request: Request, exc: PolisAIError) -> JSONResponse:
    logger.warning(
        "domain_exception",
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
        request_id=_request_id(request),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorDetail(code=exc.code, message=exc.message),
            request_id=_request_id(request),
        ).model_dump(),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    first = errors[0] if errors else {}
    field = ".".join(str(loc) for loc in first.get("loc", [])[1:]) or None
    logger.info(
        "validation_error",
        errors=errors,
        path=request.url.path,
        request_id=_request_id(request),
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message=first.get("msg", "Validation error"),
                field=field,
            ),
            request_id=_request_id(request),
        ).model_dump(),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "unhandled_exception",
        exc_info=exc,
        path=request.url.path,
        request_id=_request_id(request),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error=ErrorDetail(code="INTERNAL_ERROR", message="An unexpected error occurred"),
            request_id=_request_id(request),
        ).model_dump(),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(PolisAIError, polisai_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
