from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse
import secrets
import json
import base64
import asyncio
import httpx
import requests

from redis_client import add_key_value_redis, get_value_redis, delete_key_redis

CLIENT_ID = 'f61fc3a1-9a70-4ebe-8289-07456abaa695'
CLIENT_SECRET = '054aeed3-fe5d-45dc-b4da-5adf1a0bc218'

SCOPE = (
    "crm.objects.contacts.read "
    "crm.objects.contacts.write "
    "crm.objects.deals.read "
    "crm.objects.deals.write "
    "crm.objects.companies.read"
)

AUTHORIZATION_URI = 'https://app.hubspot.com/oauth/authorize'
REDIRECT_URI = 'http://localhost:8000/integrations/hubspot/oauth2callback'


async def authorize_hubspot(user_id, org_id):
    state_data = {
        'state': secrets.token_urlsafe(32),
        'user_id': user_id,
        'org_id': org_id,
    }
    encoded_state = base64.urlsafe_b64encode(json.dumps(state_data).encode('utf-8')).decode('utf-8')
    auth_url = f'{AUTHORIZATION_URI}?client_id={CLIENT_ID}&scope={SCOPE}&redirect_uri={REDIRECT_URI}&state={encoded_state}'
    await add_key_value_redis(f'hubspot_state:{org_id}:{user_id}', json.dumps(state_data), expire=600)
    return auth_url


async def oauth2callback_hubspot(request: Request):
    if request.query_params.get('error'):
        raise HTTPException(status_code=400, detail=request.query_params.get('error_description'))

    code = request.query_params.get('code')
    encoded_state = request.query_params.get('state')
    state_data = json.loads(base64.urlsafe_b64decode(encoded_state).decode('utf-8'))
    original_state = state_data.get('state')
    user_id = state_data.get('user_id')
    org_id = state_data.get('org_id')
    saved_state_json = await get_value_redis(f'hubspot_state:{org_id}:{user_id}')

    if not saved_state_json or original_state != json.loads(saved_state_json).get('state'):
        raise HTTPException(status_code=400, detail='State does not match.')

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            'https://api.hubapi.com/oauth/v1/token',
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': REDIRECT_URI,
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET
            },
        )
    await delete_key_redis(f'hubspot_state:{org_id}:{user_id}')
    await add_key_value_redis(f'hubspot_credentials:{org_id}:{user_id}', json.dumps(token_response.json()), expire=600)

    return HTMLResponse(content="""
        <html><script>window.close();</script></html>
    """)


async def get_hubspot_credentials(user_id, org_id):
    credentials = await get_value_redis(f'hubspot_credentials:{org_id}:{user_id}')
    if not credentials:
        raise HTTPException(status_code=400, detail='No credentials found.')
    await delete_key_redis(f'hubspot_credentials:{org_id}:{user_id}')
    return json.loads(credentials)


# Contact item builder with meaningful fields
def create_integration_item_metadata_object(response_json):
    props = response_json.get('properties', {})
    return {
        "id": response_json.get("id"),
        "createdAt": response_json.get("createdAt"),
        "updatedAt": response_json.get("updatedAt"),
        "archived": response_json.get("archived", False),
        "firstName": props.get("firstname"),
        "lastName": props.get("lastname"),
        "email": props.get("email"),
        "phone": props.get("phone"),
        "company": props.get("company"),
        "jobTitle": props.get("jobtitle"),
        "website": props.get("website"),
        "city": props.get("city"),
        "state": props.get("state"),
        "country": props.get("country"),
    }


# Generic fetcher for HubSpot CRM objects
def fetch_items(access_token: str, url: str, aggregated_response: list):
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        results = response.json().get('results', [])
        aggregated_response.extend(results)
    else:
        print(f"[ERROR] Failed to fetch items: {response.status_code} - {response.text}")


# Main function to load data
async def get_items_hubspot(credentials):
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')

    url = (
        "https://api.hubapi.com/crm/v3/objects/contacts"
        "?properties=firstname,lastname,email,phone,company,jobtitle,website,city,state,country"
    )

    list_of_responses = []
    fetch_items(access_token, url, list_of_responses)

    return [
        create_integration_item_metadata_object(contact)
        for contact in list_of_responses
    ]

# In hubspot.py - Add these functions

# Companies fetcher
async def get_companies_hubspot(credentials):
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')

    url = (
        "https://api.hubapi.com/crm/v3/objects/companies"
        "?properties=name,domain,industry,phone,address,city,state,country"
    )

    list_of_responses = []
    fetch_items(access_token, url, list_of_responses)

    return [
        create_company_metadata_object(company)
        for company in list_of_responses
    ]

# Deals fetcher
async def get_deals_hubspot(credentials):
    credentials = json.loads(credentials)
    access_token = credentials.get('access_token')

    url = (
        "https://api.hubapi.com/crm/v3/objects/deals"
        "?properties=dealname,amount,closedate,dealstage,pipeline"
    )

    list_of_responses = []
    fetch_items(access_token, url, list_of_responses)

    return [
        create_deal_metadata_object(deal)
        for deal in list_of_responses
    ]

# Helper functions for formatting
def create_company_metadata_object(response_json):
    props = response_json.get('properties', {})
    return {
        "id": response_json.get("id"),
        "createdAt": response_json.get("createdAt"),
        "updatedAt": response_json.get("updatedAt"),
        "name": props.get("name"),
        "domain": props.get("domain"),
        "industry": props.get("industry"),
        "phone": props.get("phone"),
        "address": props.get("address"),
        "city": props.get("city"),
        "state": props.get("state"),
        "country": props.get("country"),
    }

def create_deal_metadata_object(response_json):
    props = response_json.get('properties', {})
    return {
        "id": response_json.get("id"),
        "createdAt": response_json.get("createdAt"),
        "updatedAt": response_json.get("updatedAt"),
        "dealName": props.get("dealname"),
        "amount": props.get("amount"),
        "closeDate": props.get("closedate"),
        "dealStage": props.get("dealstage"),
        "pipeline": props.get("pipeline"),
    }

# In hubspot.py
async def create_contact_hubspot(credentials, contact_data):
    credentials_json = json.loads(credentials)
    access_token = credentials_json.get('access_token')
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    properties = {
        "firstname": contact_data.get("firstName"),
        "lastname": contact_data.get("lastName"),
        "email": contact_data.get("email"),
        "phone": contact_data.get("phone"),
        "company": contact_data.get("company"),
        "jobtitle": contact_data.get("jobTitle")
    }
    
    # Remove None values
    properties = {k: v for k, v in properties.items() if v is not None}
    
    payload = {"properties": properties}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            'https://api.hubapi.com/crm/v3/objects/contacts',
            headers=headers,
            json=payload
        )
    
    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"HubSpot API error: {response.text}"
        )
    
    return response.json()