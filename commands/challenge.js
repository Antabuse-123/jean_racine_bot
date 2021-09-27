const { SlashCommandBuilder } = require('@discordjs/builders')
const mongoose = require('../utils/mongoose')
const axios = require('../utils/axios')
const { challengeInfo, challengeEmbed } = require('../utils/challenge')
const { DateTime } = require('luxon')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('challenge')
    .setDescription('Informations sur un challenge')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Identifiant du challenge')
        .setRequired(true)),

  async execute(interaction) {
    const id = interaction.options.getString('id') // ID
    let req = undefined
    let u = undefined

    try {
      req = await axios.get(`/challenges/${id}`, { params: { fakeHash: new Date().getTime() } })
      req.data.id_challenge = id
      u = challengeInfo(req.data) // Get user info
    } catch (err) {
      if (err && err.response && err.response.status === 404) return await interaction.reply({ content: 'Challenge inexistant', ephemeral: true })

      const tmpUser = await mongoose.models.challenge.findOne({ id_challenge: id }) // Find if backed up
      if (tmpUser) {
        u = tmpUser.challengeInfo() // Get user info
        u.backup = true
      }
    }

    if (u && !!Object.keys(u).length) {
      let validUsers = null
      try {
        const guildUsers = (await mongoose.models.channels.findOne({ guildId: interaction.guildId }) || {}).users
        const users = (await mongoose.models.user.find({ id_auteur: { $in: guildUsers } }) || [])
        validUsers = users.filter(v => v && v.validations && v.validations.length && v.validations.some(i => i.id_challenge === id))
          .sort((a, b) => DateTime.fromSQL((a.validations.find(i => i.id_challenge === id) || {}).date).setLocale('fr').toMillis() - DateTime.fromSQL((b.validations.find(i => i.id_challenge === id) || {}).date).setLocale('fr').toMillis())
          .map(v => v.nom)
      } catch (err) {
      }
      return await interaction.reply({ embeds: [challengeEmbed(u, false, validUsers && validUsers.length ? validUsers : null)] })
    } else {
      return await interaction.reply('Challenge inexistant' + (req === undefined ? ' ou serveur indisponible' : ''))
    }
  }
}
