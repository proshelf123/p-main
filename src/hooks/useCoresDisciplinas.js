import { useEffect, useState } from 'react'
import { escutarCoresDisciplinas } from '../firebase/estrutura'

export default function useCoresDisciplinas() {
  const [coresDisciplinas, setCoresDisciplinas] = useState({})

  useEffect(() => {
    const unsubscribe = escutarCoresDisciplinas(
      (cores) => setCoresDisciplinas(cores),
      (erro) => {
        console.error('Erro ao escolher cores das disciplinas:', erro)
        setCoresDisciplinas({})
      }
    )

    return () => unsubscribe()
  }, [])

  return coresDisciplinas
}
