from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings

_kw = {} if settings.DATABASE_URL.startswith("sqlite") else {"pool_size": 20, "max_overflow": 10}
engine = create_async_engine(settings.DATABASE_URL, echo=False, **_kw)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
