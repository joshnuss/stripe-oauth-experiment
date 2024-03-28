const clients = [
  {
    id: 'fake',
    callbacks: [
      'https://localhost/callback'
    ]
  }
]

export function isValidClient(id) {
  return !!getClient(id)
}

export function isValidCallback(clientId, url) {
  return getClient(clientId)?.callbacks.includes(url)
}

function getClient(id) {
  return clients.find(client => client.id == id)
}
