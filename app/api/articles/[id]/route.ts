import { NextRequest, NextResponse } from 'next/server'
import { updateArticle } from '../../../../lib/airtable'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const articleId = params.id
    
    const updatedArticle = await updateArticle(articleId, body)
    
    return NextResponse.json(updatedArticle)
  } catch (error) {
    console.error('Error updating article:', error)
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    )
  }
}