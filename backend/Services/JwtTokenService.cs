using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TidySense.Common.Auth;
using TidySense.Models;

namespace TidySense.Services;

public sealed class JwtTokenService(IOptions<JwtOptions> options)
{
    public string Create(User user)
    {
        var settings = options.Value;
        var claims = new[]
        {
            new Claim(AuthConstants.UserIdClaim, user.Id.ToString()),
            new Claim(AuthConstants.SessionEpochClaim, user.SessionEpoch.ToString())
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SigningKey)),
            SecurityAlgorithms.HmacSha256);
        return new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            settings.Issuer, settings.Audience, claims,
            expires: DateTime.UtcNow.AddMinutes(settings.LifetimeMinutes),
            signingCredentials: credentials));
    }
}
