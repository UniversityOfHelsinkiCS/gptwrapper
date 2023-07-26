import { Op } from 'sequelize'

import { ServiceAccessGroup } from '../db/models'

const checkAccess = async (iamGroups: string[]) => {
  const accessGroups = await ServiceAccessGroup.findAll({
    where: {
      iamGroup: {
        [Op.in]: iamGroups,
      },
    },
    attributes: ['model'],
  })

  return accessGroups.length > 0
}

export default checkAccess
