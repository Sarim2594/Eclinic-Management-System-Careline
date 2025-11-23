from fastapi import HTTPException, status
from typing import Dict, Any

def lookup_province_and_region(db, city: str) -> Dict[str, Any]:
    """Gets province and sub-region for a given city."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT city, sub_region, province
            FROM pakistan_regions
            WHERE LOWER(city) = LOWER(%s)
            LIMIT 1
        """, (city,))
        
        result = cursor.fetchone()
        
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"City '{city}' not found in regions database")
        
        return {
            "success": True,
            "city": result['city'],
            "sub_region": result['sub_region'],
            "province": result['province'],
            "region_key": f"{result['province']}|{result['sub_region']}"
        }

def get_all_geographical_regions(db) -> Dict[str, Any]:
    """Retrieves and organizes all provinces, sub-regions, and cities hierarchically."""
    with db.get_cursor() as cursor:
        cursor.execute("""
            SELECT province, sub_region, city
            FROM pakistan_regions
            ORDER BY province, sub_region, city
        """)
        
        regions = cursor.fetchall()
        
        organized = {}
        for row in regions:
            province = row['province']
            sub_region = row['sub_region']
            city = row['city']
            
            if province not in organized:
                organized[province] = {}
            if sub_region not in organized[province]:
                organized[province][sub_region] = []
            organized[province][sub_region].append(city)
        
        return {"success": True, "regions": organized}